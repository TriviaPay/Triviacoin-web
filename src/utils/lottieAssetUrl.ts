/**
 * Presigned S3 URLs for .json often block browser fetch() due to missing CORS headers.
 * React Native has no CORS, so Lottie works there. On web we proxy known hosts in dev.
 * Production: configure S3 CORS for your web origin, or serve via your API proxy.
 */

const TRIVIAPAY_ASSETS_HOST = 'triviapay-assets.s3.us-east-2.amazonaws.com'
const PROXY_PREFIX = '/__proxy/triviapay-assets'

export function getLottieJsonFetchUrl(originalUrl: string): string {
  if (!originalUrl || typeof originalUrl !== 'string') return originalUrl
  try {
    const u = new URL(originalUrl)
    if (u.hostname === TRIVIAPAY_ASSETS_HOST) {
      // NOTE: Presigned S3 URLs often fail via local proxies due to SigV4 signature mismatches on the path/headers.
      // Direct access is preferred. Ensure the S3 bucket has CORS enabled for your origin.
      return originalUrl
    }
  } catch {
    return originalUrl
  }
  return originalUrl
}
