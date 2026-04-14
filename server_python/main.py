"""
Payment API: Stripe Checkout + PayPal (sandbox) — FastAPI.
Run: uvicorn main:app --reload --port 4243

Stripe CLI: stripe listen --forward-to localhost:4243/stripe/webhook
"""
from __future__ import annotations

import base64
import json
import os
import time
from collections import defaultdict
from typing import Any

import httpx
import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
PAYPAL_API_BASE = os.environ.get("PAYPAL_API_BASE", "https://api-m.sandbox.paypal.com").rstrip("/")
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")

_ORIGINS_RAW = os.environ.get("CLIENT_ORIGIN", "http://localhost:5173")
CLIENT_FRONTEND = _ORIGINS_RAW.split(",")[0].strip().rstrip("/")

# --- Product catalog (prices & fulfillment — single source of truth) ---
PRODUCT_CATALOG: dict[str, dict[str, Any]] = {
    "GP001": {
        "unitAmountCents": 199,
        "currency": "usd",
        "name": "Gem Pack · Starter",
        "product_type": "gem_package",
        "gems_credited": 120,
        "consumable": True,
    },
    "GP002": {
        "unitAmountCents": 499,
        "currency": "usd",
        "name": "Gem Pack · Value",
        "product_type": "gem_package",
        "gems_credited": 400,
        "consumable": True,
    },
    "GP003": {
        "unitAmountCents": 999,
        "currency": "usd",
        "name": "Gem Pack · Premium",
        "product_type": "gem_package",
        "gems_credited": 1200,
        "consumable": True,
    },
    "SUB001": {
        "unitAmountCents": 999,
        "currency": "usd",
        "name": "Monthly Pro",
        "product_type": "subscription",
        "gems_credited": 0,
        "consumable": False,
        "recurring_interval": "month",
    },
    "SUB_TC_BRONZE": {
        "unitAmountCents": 500,
        "currency": "usd",
        "name": "Trivia Challenge · $5 mode (monthly)",
        "product_type": "subscription",
        "gems_credited": 0,
        "consumable": False,
        "recurring_interval": "month",
    },
    "SUB_TC_SILVER": {
        "unitAmountCents": 1000,
        "currency": "usd",
        "name": "Trivia Challenge · $10 mode (monthly)",
        "product_type": "subscription",
        "gems_credited": 0,
        "consumable": False,
        "recurring_interval": "month",
    },
    "SUB_TC_GOLD": {
        "unitAmountCents": 1500,
        "currency": "usd",
        "name": "Trivia Challenge · $15 mode (monthly)",
        "product_type": "subscription",
        "gems_credited": 0,
        "consumable": False,
        "recurring_interval": "month",
    },
    "SUB_TC_PLATINUM": {
        "unitAmountCents": 2000,
        "currency": "usd",
        "name": "Trivia Challenge · $20 mode (monthly)",
        "product_type": "subscription",
        "gems_credited": 0,
        "consumable": False,
        "recurring_interval": "month",
    },
}

WALLET_TOPUP = "WALLET_TOPUP"
WALLET_TOPUP_MIN_CENTS = 100
WALLET_TOPUP_MAX_CENTS = 50_000

# Backwards aliases → canonical GP ids
PRODUCT_ALIASES: dict[str, str] = {
    "gem_starter": "GP001",
    "gem_value": "GP002",
    "gem_premium": "GP003",
}

_DEFAULT_PP_PLAN = os.environ.get("PAYPAL_PLAN_SUB001", "P-5ML4271244454362WXNWU5NQ")
PAYPAL_PLAN_BY_PRODUCT: dict[str, str] = {
    "SUB001": _DEFAULT_PP_PLAN,
    "SUB_TC_BRONZE": os.environ.get("PAYPAL_PLAN_SUB_TC_BRONZE") or _DEFAULT_PP_PLAN,
    "SUB_TC_SILVER": os.environ.get("PAYPAL_PLAN_SUB_TC_SILVER") or _DEFAULT_PP_PLAN,
    "SUB_TC_GOLD": os.environ.get("PAYPAL_PLAN_SUB_TC_GOLD") or _DEFAULT_PP_PLAN,
    "SUB_TC_PLATINUM": os.environ.get("PAYPAL_PLAN_SUB_TC_PLATINUM") or _DEFAULT_PP_PLAN,
}


def _gems_for_wallet_topup(amount_cents: int) -> int:
    """100 gems per $1 charged (server-defined)."""
    return max(1, (amount_cents // 100) * 100)


def _is_wallet_topup(product_id: str) -> bool:
    return product_id.strip().upper() == WALLET_TOPUP

# --- Demo persistence (replace with DB) ---
fulfillment_by_stripe_session: dict[str, dict[str, Any]] = {}
paypal_orders: dict[str, dict[str, Any]] = {}
paypal_subscriptions: dict[str, dict[str, Any]] = {}
user_owned_non_consumables: dict[str, set[str]] = defaultdict(set)

# Rate limit: (user_id, route) -> timestamps
_rate_hits: dict[tuple[str, str], list[float]] = defaultdict(list)

app = FastAPI(title="Payments API (Stripe + PayPal)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _ORIGINS_RAW.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _canonical_product_id(product_id: str) -> str:
    pid = product_id.strip()
    return PRODUCT_ALIASES.get(pid, pid)


def _get_catalog(product_id: str) -> dict[str, Any]:
    cid = _canonical_product_id(product_id)
    prod = PRODUCT_CATALOG.get(cid)
    if not prod:
        raise HTTPException(status_code=400, detail="invalid product_id")
    prod = {**prod, "_id": cid}
    return prod


def _assert_product_allowed_for_paypal(cat: dict[str, Any], product_id: str, subscriptions_only: bool = False) -> None:
    if product_id.startswith("BD"):
        raise HTTPException(status_code=400, detail="Badges cannot be purchased with PayPal")
    ptype = cat["product_type"]
    if subscriptions_only:
        if ptype != "subscription":
            raise HTTPException(status_code=400, detail="Use subscription-config for subscriptions only")
    else:
        if ptype == "subscription":
            raise HTTPException(status_code=400, detail="Subscriptions must use subscription-config flow")


def _assert_not_owned_conflict(user_id: str, product_id: str, cat: dict[str, Any]) -> None:
    if cat.get("consumable", False):
        return
    if product_id in user_owned_non_consumables[user_id]:
        raise HTTPException(status_code=409, detail="Already own this item")


def user_id_from_authorization(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        return "guest"
    jwt = authorization[7:].strip()
    parts = jwt.split(".")
    if len(parts) != 3:
        return "guest"
    try:
        pad = "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + pad))
        return str(payload.get("sub") or payload.get("user_id") or payload.get("id") or "guest")
    except Exception:
        return "guest"


def require_auth_user(authorization: str | None = Header(default=None)) -> str:
    uid = user_id_from_authorization(authorization)
    if uid == "guest":
        raise HTTPException(status_code=401, detail="Authentication required")
    return uid


def rate_limit(user_id: str, route: str, limit: int = 10, window_sec: int = 60) -> None:
    now = time.time()
    key = (user_id, route)
    bucket = _rate_hits[key]
    bucket[:] = [t for t in bucket if now - t < window_sec]
    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    bucket.append(now)


def _minor_amount(cents: int) -> int:
    return cents


# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------
stripe_router = APIRouter(prefix="/stripe", tags=["stripe"])


class StripeCheckoutBody(BaseModel):
    product_id: str = Field(..., min_length=1)
    amount_cents: int | None = Field(default=None, ge=WALLET_TOPUP_MIN_CENTS, le=WALLET_TOPUP_MAX_CENTS)


@stripe_router.post("/checkout-session")
async def stripe_checkout_session(
    body: StripeCheckoutBody,
    authorization: str | None = Header(default=None),
):
    user_id = require_auth_user(authorization)
    rate_limit(user_id, "stripe_checkout")
    pid_raw = body.product_id.strip()
    if pid_raw.startswith("BD"):
        raise HTTPException(status_code=400, detail="Badges cannot be purchased")

    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not configured")

    success_url = (os.environ.get("STRIPE_SUCCESS_URL") or "").strip() or (
        f"{CLIENT_FRONTEND}/success?session_id={{CHECKOUT_SESSION_ID}}"
    )
    cancel_url = (os.environ.get("STRIPE_CANCEL_URL") or "").strip() or f"{CLIENT_FRONTEND}/cancel"

    if _is_wallet_topup(pid_raw):
        ac = body.amount_cents
        if ac is None:
            raise HTTPException(status_code=400, detail="amount_cents required for wallet top-up")
        gems = _gems_for_wallet_topup(ac)
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": ac,
                        "product_data": {"name": "Wallet top-up"},
                    },
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "product_id": WALLET_TOPUP,
                "amount_cents": str(ac),
                "gems_credited": str(gems),
            },
        )
        return {"session_id": session.id, "checkout_url": session.url}

    cat = _get_catalog(body.product_id)
    canonical = cat["_id"]
    _assert_not_owned_conflict(user_id, canonical, cat)

    line_params: dict[str, Any]
    mode: str
    if cat["product_type"] == "subscription":
        mode = "subscription"
        line_params = {
            "quantity": 1,
            "price_data": {
                "currency": cat["currency"],
                "unit_amount": cat["unitAmountCents"],
                "recurring": {"interval": cat.get("recurring_interval", "month")},
                "product_data": {"name": cat["name"]},
            },
        }
    else:
        mode = "payment"
        line_params = {
            "quantity": 1,
            "price_data": {
                "currency": cat["currency"],
                "unit_amount": cat["unitAmountCents"],
                "product_data": {"name": cat["name"]},
            },
        }

    session = stripe.checkout.Session.create(
        mode=mode,
        line_items=[line_params],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "product_id": canonical,
            "product_name": cat["name"],
        },
    )

    return {"session_id": session.id, "checkout_url": session.url}


@stripe_router.get("/session-status")
async def stripe_session_status(
    session_id: str = Query(..., min_length=1),
    authorization: str | None = Header(default=None),
):
    _ = require_auth_user(authorization)
    if not session_id.startswith("cs_"):
        raise HTTPException(status_code=400, detail="invalid session_id")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        err = str(e).lower()
        if "no such checkout" in err or "resource_missing" in err:
            raise HTTPException(status_code=404, detail="session not found") from None
        raise HTTPException(status_code=500, detail=str(e)) from e

    meta = session.metadata or {}
    product_id = str(meta.get("product_id") or "")
    if product_id == WALLET_TOPUP:
        ac = int(meta.get("amount_cents") or 0)
        gmeta = int(meta.get("gems_credited") or _gems_for_wallet_topup(ac))
        payment_status = "paid" if session.payment_status == "paid" else "unpaid"
        fulfilled = fulfillment_by_stripe_session.get(session_id)
        if fulfilled:
            return {
                "payment_status": payment_status,
                "fulfillment_status": str(fulfilled.get("fulfillment_status", "fulfilled")),
                "product_id": WALLET_TOPUP,
                "product_type": "wallet_topup",
                "price_minor": ac,
                "gems_credited": int(fulfilled.get("gems_credited", gmeta)),
                "asset_granted": False,
                "completed_at": fulfilled.get("completed_at"),
            }
        pend_gems = gmeta if payment_status == "paid" else 0
        return {
            "payment_status": payment_status,
            "fulfillment_status": "pending" if payment_status == "paid" else "unfulfilled",
            "product_id": WALLET_TOPUP,
            "product_type": "wallet_topup",
            "price_minor": ac,
            "gems_credited": pend_gems,
            "asset_granted": False,
            "completed_at": None,
        }

    try:
        cat = _get_catalog(product_id) if product_id else {}
    except HTTPException:
        cat = {}
    has_cat = bool(cat.get("_id"))
    canonical = (cat.get("_id") if has_cat else None) or product_id
    payment_status = "paid" if session.payment_status == "paid" else "unpaid"

    fulfilled = fulfillment_by_stripe_session.get(session_id)
    if fulfilled:
        fulfillment_status = str(fulfilled.get("fulfillment_status", "fulfilled"))
        gems_credited = int(fulfilled.get("gems_credited", cat.get("gems_credited", 0) if has_cat else 0))
        asset_granted = bool(fulfilled.get("asset_granted", False))
        completed_at = fulfilled.get("completed_at")
    elif payment_status == "paid":
        fulfillment_status = "pending"
        gems_credited = int(cat.get("gems_credited", 0)) if has_cat else 0
        asset_granted = False
        completed_at = None
    else:
        fulfillment_status = "unfulfilled"
        gems_credited = int(cat.get("gems_credited", 0)) if has_cat else 0
        asset_granted = False
        completed_at = None

    return {
        "payment_status": payment_status,
        "fulfillment_status": fulfillment_status,
        "product_id": canonical or product_id,
        "product_type": cat.get("product_type", "unknown") if has_cat else "unknown",
        "price_minor": _minor_amount(int(cat.get("unitAmountCents", 0))) if has_cat else 0,
        "gems_credited": gems_credited,
        "asset_granted": asset_granted,
        "completed_at": completed_at,
    }


@stripe_router.post("/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        return Response("Webhook not configured", status_code=500)
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    if not sig:
        return Response("Missing signature", status_code=400)
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        return Response("Invalid payload", status_code=400)
    except Exception:
        return Response("Invalid signature", status_code=400)

    if event["type"] == "checkout.session.completed":
        sess = event["data"]["object"]
        sid = sess.get("id")
        meta = sess.get("metadata") or {}
        product_id = str(meta.get("product_id") or "")
        if sid and product_id:
            try:
                if product_id == WALLET_TOPUP:
                    ac = int(meta.get("amount_cents") or 0)
                    gems = int(meta.get("gems_credited") or _gems_for_wallet_topup(ac))
                    fulfillment_by_stripe_session[sid] = {
                        "fulfillment_status": "fulfilled",
                        "gems_credited": gems,
                        "asset_granted": False,
                        "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    }
                else:
                    cat = _get_catalog(product_id)
                    canonical = cat["_id"]
                    gems = int(cat.get("gems_credited", 0))
                    fulfillment_by_stripe_session[sid] = {
                        "fulfillment_status": "fulfilled",
                        "gems_credited": gems,
                        "asset_granted": cat["product_type"] in ("avatar", "frame"),
                        "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    }
                    if not cat.get("consumable", False):
                        uid = str(meta.get("user_id") or "")
                        if uid:
                            user_owned_non_consumables[uid].add(canonical)
            except Exception as exc:
                print("[stripe webhook] fulfillment error", exc)

    return {"received": True}


# ---------------------------------------------------------------------------
# PayPal
# ---------------------------------------------------------------------------
_paypal_token_cache: dict[str, Any] = {"token": None, "exp": 0.0}

paypal_router = APIRouter(prefix="/paypal", tags=["paypal"])


async def _paypal_access_token() -> str:
    now = time.time()
    tok = _paypal_token_cache.get("token")
    exp = float(_paypal_token_cache.get("exp") or 0)
    if tok and now < exp - 30:
        return str(tok)
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="PayPal is not configured")
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"PayPal auth failed: {r.text}")
    data = r.json()
    token = data["access_token"]
    expires_in = int(data.get("expires_in", 300))
    _paypal_token_cache["token"] = token
    _paypal_token_cache["exp"] = now + expires_in
    return str(token)


@paypal_router.get("/client-id")
async def paypal_client_id():
    if not PAYPAL_CLIENT_ID:
        raise HTTPException(status_code=503, detail="PAYPAL_CLIENT_ID not configured")
    mode = "sandbox" if "sandbox" in PAYPAL_API_BASE.lower() else "live"
    return {"client_id": PAYPAL_CLIENT_ID, "mode": mode}


class PayPalCreateOrderBody(BaseModel):
    product_id: str = Field(..., min_length=1)
    amount_cents: int | None = Field(default=None, ge=WALLET_TOPUP_MIN_CENTS, le=WALLET_TOPUP_MAX_CENTS)


@paypal_router.post("/create-order")
async def paypal_create_order(body: PayPalCreateOrderBody, authorization: str | None = Header(default=None)):
    user_id = require_auth_user(authorization)
    rate_limit(user_id, "paypal_create_order")
    pid = body.product_id.strip()

    if _is_wallet_topup(pid):
        ac = body.amount_cents
        if ac is None:
            raise HTTPException(status_code=400, detail="amount_cents required for wallet top-up")
        gems = _gems_for_wallet_topup(ac)
        try:
            token = await _paypal_access_token()
        except HTTPException:
            raise
        value = f"{ac / 100:.2f}"
        custom = json.dumps(
            {"user_id": user_id, "product_id": WALLET_TOPUP, "amount_cents": ac, "gems_credited": gems}
        )
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{PAYPAL_API_BASE}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [
                        {
                            "custom_id": custom,
                            "amount": {"currency_code": "USD", "value": value},
                        }
                    ],
                },
            )
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"PayPal order failed: {r.text}")
        data = r.json()
        order_id = data.get("id")
        if not order_id:
            raise HTTPException(status_code=502, detail="PayPal order missing id")
        paypal_orders[str(order_id)] = {
            "user_id": user_id,
            "product_id": WALLET_TOPUP,
            "amount_cents": ac,
            "gems_credited": gems,
            "status": "created",
            "fulfillment_status": "unfulfilled",
        }
        return {"paypal_order_id": str(order_id)}

    cat = _get_catalog(body.product_id)
    canonical = cat["_id"]
    _assert_product_allowed_for_paypal(cat, body.product_id, subscriptions_only=False)
    _assert_not_owned_conflict(user_id, canonical, cat)

    try:
        token = await _paypal_access_token()
    except HTTPException:
        raise
    value = f"{int(cat['unitAmountCents']) / 100:.2f}"
    currency = str(cat["currency"]).upper()
    custom = json.dumps({"user_id": user_id, "product_id": canonical})
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "custom_id": custom,
                        "amount": {"currency_code": currency, "value": value},
                    }
                ],
            },
        )
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"PayPal order failed: {r.text}")
    data = r.json()
    order_id = data.get("id")
    if not order_id:
        raise HTTPException(status_code=502, detail="PayPal order missing id")
    paypal_orders[str(order_id)] = {
        "user_id": user_id,
        "product_id": canonical,
        "status": "created",
        "fulfillment_status": "unfulfilled",
    }
    return {"paypal_order_id": str(order_id)}


class PayPalCaptureBody(BaseModel):
    paypal_order_id: str = Field(..., min_length=1)


@paypal_router.post("/capture-order")
async def paypal_capture_order(body: PayPalCaptureBody, authorization: str | None = Header(default=None)):
    user_id = require_auth_user(authorization)
    rate_limit(user_id, "paypal_capture_order")
    oid = body.paypal_order_id.strip()
    rec = paypal_orders.get(oid)
    if not rec or rec.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="checkout not found")

    token = await _paypal_access_token()
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders/{oid}/capture",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={},
        )
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"PayPal capture failed: {r.text}")
    pid = str(rec["product_id"])
    if pid == WALLET_TOPUP:
        gems = int(rec.get("gems_credited") or _gems_for_wallet_topup(int(rec.get("amount_cents") or 0)))
        paypal_orders[oid] = {
            **rec,
            "status": "captured",
            "payment_status": "captured",
            "fulfillment_status": "fulfilled",
            "gems_credited": gems,
            "asset_granted": False,
            "product_type": "wallet_topup",
            "capture_raw": r.json(),
        }
        return {
            "payment_status": "captured",
            "fulfillment_status": "fulfilled",
            "gems_credited": gems,
            "asset_granted": False,
        }
    cat = _get_catalog(pid)
    gems = int(cat.get("gems_credited", 0))
    paypal_orders[oid] = {
        **rec,
        "status": "captured",
        "payment_status": "captured",
        "fulfillment_status": "fulfilled",
        "gems_credited": gems,
        "asset_granted": cat["product_type"] in ("avatar", "frame"),
        "product_type": cat["product_type"],
        "capture_raw": r.json(),
    }
    if not cat.get("consumable", False):
        user_owned_non_consumables[user_id].add(cat["_id"])
    return {
        "payment_status": "captured",
        "fulfillment_status": "fulfilled",
        "gems_credited": gems,
        "asset_granted": cat["product_type"] in ("avatar", "frame"),
    }


@paypal_router.get("/order-status")
async def paypal_order_status(
    checkout_id: str = Query(..., min_length=1),
    authorization: str | None = Header(default=None),
):
    user_id = require_auth_user(authorization)
    rec = paypal_orders.get(checkout_id.strip())
    if not rec or rec.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="checkout not found")
    pid = str(rec["product_id"])
    if pid == WALLET_TOPUP:
        return {
            "payment_status": rec.get("payment_status", "pending"),
            "fulfillment_status": rec.get("fulfillment_status", "unfulfilled"),
            "product_id": WALLET_TOPUP,
            "product_type": "wallet_topup",
            "gems_credited": int(rec.get("gems_credited", 0)),
            "asset_granted": bool(rec.get("asset_granted", False)),
        }
    cat = _get_catalog(pid)
    return {
        "payment_status": rec.get("payment_status", "pending"),
        "fulfillment_status": rec.get("fulfillment_status", "unfulfilled"),
        "product_id": str(rec["product_id"]),
        "product_type": cat["product_type"],
        "gems_credited": int(rec.get("gems_credited", 0)),
        "asset_granted": bool(rec.get("asset_granted", False)),
    }


@paypal_router.get("/subscription-config")
async def paypal_subscription_config(
    product_id: str = Query(..., min_length=1),
    authorization: str | None = Header(default=None),
):
    user_id = require_auth_user(authorization)
    rate_limit(user_id, "paypal_sub_config")
    cat = _get_catalog(product_id)
    _assert_product_allowed_for_paypal(cat, product_id, subscriptions_only=True)
    canonical = cat["_id"]
    plan_id = PAYPAL_PLAN_BY_PRODUCT.get(canonical)
    if not plan_id:
        raise HTTPException(status_code=400, detail="No PayPal plan mapped for this product")
    return {"paypal_plan_id": plan_id, "product_id": canonical}


class PayPalSubscriptionApprovedBody(BaseModel):
    paypal_subscription_id: str = Field(..., min_length=1)
    product_id: str = Field(..., min_length=1)


@paypal_router.post("/subscription-approved")
async def paypal_subscription_approved(
    body: PayPalSubscriptionApprovedBody,
    authorization: str | None = Header(default=None),
):
    user_id = require_auth_user(authorization)
    rate_limit(user_id, "paypal_sub_approved")
    cat = _get_catalog(body.product_id)
    _assert_product_allowed_for_paypal(cat, body.product_id, subscriptions_only=True)
    canonical = cat["_id"]
    sid = body.paypal_subscription_id.strip()
    paypal_subscriptions[sid] = {
        "user_id": user_id,
        "product_id": canonical,
        "payment_status": "approved",
        "fulfillment_status": "unfulfilled",
    }
    return {"payment_status": "approved", "fulfillment_status": "unfulfilled"}


@paypal_router.post("/webhook")
async def paypal_webhook_placeholder():
    """PayPal server-to-server webhooks should verify signatures in production."""
    return {"received": True}


app.include_router(stripe_router)
app.include_router(paypal_router)


@app.get("/health")
async def health():
    return {"ok": True}
