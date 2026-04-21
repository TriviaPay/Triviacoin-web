import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { API_CONFIG } from '../config/api'
import { fetchModesStatusCached, triviaRequest, type ModesStatusResponse } from '../lib/triviaApi'
import { logout } from './authSlice'

const T = API_CONFIG.ENDPOINTS.TRIVIA

export type FreeModeQuestion = {
  question_id: number
  question_order: number
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  hint: string
  fill_in_answer: string | null
  explanation: string
  category: string
  difficulty_level: string
  picture_url: string | null
  status: string
  is_correct: boolean | null
  answered_at: string | null
}

/** Backend may send `all_questions_answered: true` while `progress.completed` is still false — normalize in fetch. */
export type FreeModeStatusResponse = {
  progress: {
    correct_answers: number
    total_questions: number
    completed: boolean
  }
  /** Present when API sends it before progress.completed is flipped */
  all_questions_answered?: boolean
  completion_time: string | null
  is_winner: boolean
  current_date: string
}

/** Unify flat + nested status shapes from /trivia/free-mode/status */
export function normalizeFreeModeStatus(raw: unknown): FreeModeStatusResponse {
  const r = raw as Record<string, unknown>
  const prog = (r.progress as Record<string, unknown>) || {}

  const correctFromProg = typeof prog.correct_answers === 'number' ? prog.correct_answers : undefined
  const totalFromProg = typeof prog.total_questions === 'number' ? prog.total_questions : undefined
  const completedFromProg = typeof prog.completed === 'boolean' ? prog.completed : undefined

  const correct =
    correctFromProg ?? (typeof r.correct_answers === 'number' ? (r.correct_answers as number) : 0)
  const total = totalFromProg ?? (typeof r.total_questions === 'number' ? (r.total_questions as number) : 0)

  const allAnswered = r.all_questions_answered === true
  const topCompleted = r.completed === true
  const progressCompleted = completedFromProg === true
  const completed = progressCompleted || topCompleted || allAnswered

  return {
    progress: {
      correct_answers: correct,
      total_questions: total,
      completed,
    },
    all_questions_answered: allAnswered,
    completion_time: (r.completion_time as string | null) ?? null,
    is_winner: Boolean(r.is_winner),
    current_date: String(r.current_date ?? ''),
  }
}

export function isFreeModeComplete(status: FreeModeStatusResponse | null | undefined): boolean {
  if (!status) return false
  if (status.progress?.completed) return true
  if (status.all_questions_answered) return true
  return false
}

export type BronzeSilverModeQuestion = {
  question_id: number
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  hint: string
  fill_in_answer: string | null
  explanation: string
  category: string
  difficulty_level: string
  picture_url: string | null
  status: string
  is_correct: boolean | null
  submitted_at: string | null
  is_open: boolean
  time_until_close_seconds: number
}

export type BronzeSilverModeStatusResponse = {
  has_access?: boolean
  subscription_status?: string
  has_submitted: boolean
  submitted_at: string | null
  is_correct: boolean | null
  fill_in_answer: string | null
  is_winner: boolean
  current_date: string
}

export type SubmissionResult = {
  is_correct: boolean
  correct_answer?: string
  explanation: string
  daily_completed?: boolean
}

type TriviaState = {
  currentMode: 'free' | 'bronze' | 'silver' | null
  modesStatus: ModesStatusResponse | null
  modesStatusLastFetched: number | null
  modesStatusLoading: boolean
  currentFreeModeQuestion: FreeModeQuestion | null
  freeModeQuestions: FreeModeQuestion[] | null
  freeModeStatus: FreeModeStatusResponse | null
  currentBronzeModeQuestion: BronzeSilverModeQuestion | null
  bronzeModeStatus: BronzeSilverModeStatusResponse | null
  currentSilverModeQuestion: BronzeSilverModeQuestion | null
  silverModeStatus: BronzeSilverModeStatusResponse | null
  selectedAnswer: string | null
  selectedOptionText: string | null
  isSubmitted: boolean
  loading: boolean
  error: string | null
  submissionResult: SubmissionResult | null
}

const MODES_STATUS_TTL_MS = 2 * 60 * 1000

const initialState: TriviaState = {
  currentMode: null,
  modesStatus: null,
  modesStatusLastFetched: null,
  modesStatusLoading: false,
  currentFreeModeQuestion: null,
  freeModeQuestions: null,
  freeModeStatus: null,
  currentBronzeModeQuestion: null,
  bronzeModeStatus: null,
  currentSilverModeQuestion: null,
  silverModeStatus: null,
  selectedAnswer: null,
  selectedOptionText: null,
  isSubmitted: false,
  loading: false,
  error: null,
  submissionResult: null,
}

function parseFreeCurrentPayload(raw: unknown): FreeModeQuestion {
  const r = raw as Record<string, unknown>
  if (r?.no_question_available) {
    throw new Error(String(r.detail ?? 'No current question available'))
  }
  const candidate =
    (r && typeof r === 'object' && 'question' in r && (r as { question: FreeModeQuestion }).question) ||
    (r && typeof r === 'object' && 'data' in r && (r as { data?: { question?: FreeModeQuestion } }).data?.question) ||
    (r && typeof r === 'object' && 'question_id' in r && r) ||
    null
  if (!candidate || !(candidate as FreeModeQuestion).question_id) {
    throw new Error('No current question available')
  }
  return candidate as FreeModeQuestion
}

export type FetchModesStatusArg = { force?: boolean } | undefined

export const fetchModesStatus = createAsyncThunk(
  'trivia/fetchModesStatus',
  async (_arg: FetchModesStatusArg, { rejectWithValue }) => {
    try {
      return await fetchModesStatusCached()
    } catch (e) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load modes')
    }
  },
  {
    condition: (arg, { getState }) => {
      const force = Boolean(arg && typeof arg === 'object' && arg.force)
      if (force) return true
      const t = (getState() as { trivia: TriviaState }).trivia
      if (t.modesStatusLoading) return false
      if (t.modesStatusLastFetched != null && Date.now() - t.modesStatusLastFetched < MODES_STATUS_TTL_MS) {
        return false
      }
      return true
    },
  }
)

export const fetchFreeModeStatus = createAsyncThunk('trivia/fetchFreeModeStatus', async (_, { rejectWithValue }) => {
  try {
    const raw = await triviaRequest<unknown>(T.FREE_MODE_STATUS)
    return normalizeFreeModeStatus(raw)
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load status')
  }
})

export const fetchFreeModeQuestions = createAsyncThunk('trivia/fetchFreeModeQuestions', async (_, { rejectWithValue }) => {
  try {
    const res = await triviaRequest<{ questions: FreeModeQuestion[] }>(T.FREE_MODE_QUESTIONS)
    if (!res?.questions || !Array.isArray(res.questions)) return rejectWithValue('Invalid questions response')
    return res
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load questions')
  }
})

export const fetchCurrentFreeQuestion = createAsyncThunk('trivia/fetchCurrentFreeQuestion', async (_, { rejectWithValue }) => {
  try {
    const raw = await triviaRequest<unknown>(`${T.FREE_MODE_CURRENT}?_t=${Date.now()}`)
    return parseFreeCurrentPayload(raw)
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load question')
  }
})

export const submitFreeModeAnswer = createAsyncThunk(
  'trivia/submitFreeModeAnswer',
  async ({ question_id, answer }: { question_id: number; answer: string }, { rejectWithValue }) => {
    try {
      return await triviaRequest<{ status: string; is_correct: boolean; message: string }>(T.FREE_MODE_SUBMIT, {
        method: 'POST',
        body: { question_id, answer },
      })
    } catch (e) {
      const err = e as Error & { body?: { is_correct?: boolean; message?: string } }
      if (err.body && typeof err.body.is_correct === 'boolean') {
        return rejectWithValue({
          message: err.body.message ?? err.message,
          is_correct: err.body.is_correct,
        })
      }
      return rejectWithValue(e instanceof Error ? e.message : 'Submit failed')
    }
  }
)

export const fetchBronzeModeQuestion = createAsyncThunk('trivia/fetchBronzeModeQuestion', async (_, { rejectWithValue }) => {
  try {
    const res = await triviaRequest<{ question: BronzeSilverModeQuestion }>(`${T.BRONZE_QUESTION}?_t=${Date.now()}`)
    if (!res?.question) return rejectWithValue('No bronze question')
    return res.question
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load bronze question')
  }
})

export const fetchBronzeModeStatus = createAsyncThunk('trivia/fetchBronzeModeStatus', async (_, { rejectWithValue }) => {
  try {
    return await triviaRequest<BronzeSilverModeStatusResponse>(T.BRONZE_STATUS)
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load bronze status')
  }
})

export const submitBronzeModeAnswer = createAsyncThunk(
  'trivia/submitBronzeModeAnswer',
  async ({ question_id, answer }: { question_id: number; answer: string }, { rejectWithValue }) => {
    try {
      return await triviaRequest<{
        status: string
        is_correct: boolean
        submitted_at: string
        message: string
        level_info?: unknown
      }>(T.BRONZE_SUBMIT, { method: 'POST', body: { question_id, answer } })
    } catch (e) {
      const err = e as Error & { body?: { is_correct?: boolean; message?: string } }
      if (err.body && typeof err.body.is_correct === 'boolean') {
        return rejectWithValue({ message: err.body.message ?? err.message, is_correct: err.body.is_correct })
      }
      return rejectWithValue(e instanceof Error ? e.message : 'Submit failed')
    }
  }
)

export const fetchSilverModeQuestion = createAsyncThunk('trivia/fetchSilverModeQuestion', async (_, { rejectWithValue }) => {
  try {
    const res = await triviaRequest<{ question: BronzeSilverModeQuestion }>(`${T.SILVER_QUESTION}?_t=${Date.now()}`)
    if (!res?.question) return rejectWithValue('No silver question')
    return res.question
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load silver question')
  }
})

export const fetchSilverModeStatus = createAsyncThunk('trivia/fetchSilverModeStatus', async (_, { rejectWithValue }) => {
  try {
    return await triviaRequest<BronzeSilverModeStatusResponse>(T.SILVER_STATUS)
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load silver status')
  }
})

export const submitSilverModeAnswer = createAsyncThunk(
  'trivia/submitSilverModeAnswer',
  async ({ question_id, answer }: { question_id: number; answer: string }, { rejectWithValue }) => {
    try {
      return await triviaRequest<{
        status: string
        is_correct: boolean
        submitted_at: string
        message: string
        level_info?: unknown
      }>(T.SILVER_SUBMIT, { method: 'POST', body: { question_id, answer } })
    } catch (e) {
      const err = e as Error & { body?: { is_correct?: boolean; message?: string } }
      if (err.body && typeof err.body.is_correct === 'boolean') {
        return rejectWithValue({ message: err.body.message ?? err.message, is_correct: err.body.is_correct })
      }
      return rejectWithValue(e instanceof Error ? e.message : 'Submit failed')
    }
  }
)

export const triviaSlice = createSlice({
  name: 'trivia',
  initialState,
  reducers: {
    setSelectedAnswer: (state, action: PayloadAction<{ id: string | null; text: string | null }>) => {
      state.selectedAnswer = action.payload.id
      state.selectedOptionText = action.payload.text
    },
    setCurrentMode: (state, action: PayloadAction<'free' | 'bronze' | 'silver' | null>) => {
      state.currentMode = action.payload
    },
    clearSubmissionResult: (state) => {
      state.submissionResult = null
      state.isSubmitted = false
    },
    resetTriviaUi: (state) => {
      state.selectedAnswer = null
      state.selectedOptionText = null
      state.isSubmitted = false
      state.submissionResult = null
      state.error = null
      state.currentFreeModeQuestion = null
      state.currentBronzeModeQuestion = null
      state.currentSilverModeQuestion = null
    },
    clearTriviaError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => ({ ...initialState }))

    builder
      .addCase(fetchModesStatus.pending, (state) => {
        state.modesStatusLoading = true
      })
      .addCase(fetchModesStatus.fulfilled, (state, action) => {
        state.modesStatusLoading = false
        state.modesStatus = action.payload
        state.modesStatusLastFetched = Date.now()
      })
      .addCase(fetchModesStatus.rejected, (state) => {
        state.modesStatusLoading = false
      })
      .addCase(fetchFreeModeStatus.pending, (state) => {
        state.error = null
      })
      .addCase(fetchFreeModeStatus.fulfilled, (state, action) => {
        state.freeModeStatus = action.payload
      })
      .addCase(fetchFreeModeStatus.rejected, (state, action) => {
        state.error = typeof action.payload === 'string' ? action.payload : String(action.payload)
      })

    builder
      .addCase(fetchFreeModeQuestions.fulfilled, (state, action) => {
        state.freeModeQuestions = action.payload.questions
      })
      .addCase(fetchCurrentFreeQuestion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCurrentFreeQuestion.fulfilled, (state, action) => {
        state.loading = false
        state.currentFreeModeQuestion = action.payload
        state.currentMode = 'free'
        state.selectedAnswer = null
        state.selectedOptionText = null
        state.isSubmitted = false
        state.submissionResult = null
      })
      .addCase(fetchCurrentFreeQuestion.rejected, (state, action) => {
        state.loading = false
        state.currentFreeModeQuestion = null
        state.error = typeof action.payload === 'string' ? action.payload : String(action.payload)
      })

    builder
      .addCase(submitFreeModeAnswer.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(submitFreeModeAnswer.fulfilled, (state, action) => {
        state.loading = false
        state.isSubmitted = true
        if (state.currentFreeModeQuestion) {
          state.currentFreeModeQuestion.is_correct = action.payload.is_correct
          state.currentFreeModeQuestion.status = action.payload.is_correct ? 'answered_correct' : 'answered_wrong'
        }
        state.submissionResult = {
          is_correct: action.payload.is_correct,
          correct_answer: state.currentFreeModeQuestion?.correct_answer,
          explanation: action.payload.message ?? '',
          daily_completed: state.freeModeStatus?.progress.completed ?? false,
        }
      })
      .addCase(submitFreeModeAnswer.rejected, (state, action) => {
        state.loading = false
        const p = action.payload
        if (p && typeof p === 'object' && 'is_correct' in p) {
          const pl = p as { is_correct: boolean; message?: string }
          state.isSubmitted = true
          state.submissionResult = {
            is_correct: pl.is_correct,
            correct_answer: state.currentFreeModeQuestion?.correct_answer,
            explanation: pl.message ?? '',
            daily_completed: false,
          }
        } else {
          state.error = typeof action.payload === 'string' ? action.payload : String(action.payload)
        }
      })

    builder
      .addCase(fetchBronzeModeQuestion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBronzeModeQuestion.fulfilled, (state, action) => {
        state.loading = false
        state.currentBronzeModeQuestion = action.payload
        state.currentMode = 'bronze'
        state.selectedAnswer = null
        state.selectedOptionText = null
        state.isSubmitted = false
        state.submissionResult = null
      })
      .addCase(fetchBronzeModeQuestion.rejected, (state, action) => {
        state.loading = false
        state.error = typeof action.payload === 'string' ? action.payload : String(action.payload)
      })
      .addCase(fetchBronzeModeStatus.fulfilled, (state, action) => {
        state.bronzeModeStatus = action.payload
      })
      .addCase(submitBronzeModeAnswer.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(submitBronzeModeAnswer.fulfilled, (state, action) => {
        state.loading = false
        state.isSubmitted = true
        if (state.currentBronzeModeQuestion) {
          state.currentBronzeModeQuestion.is_correct = action.payload.is_correct
          state.currentBronzeModeQuestion.submitted_at = action.payload.submitted_at
          state.currentBronzeModeQuestion.status = 'answered'
        }
        state.submissionResult = {
          is_correct: action.payload.is_correct,
          correct_answer: state.currentBronzeModeQuestion?.correct_answer,
          explanation: action.payload.message ?? '',
        }
      })
      .addCase(submitBronzeModeAnswer.rejected, (state, action) => {
        state.loading = false
        const p = action.payload
        if (p && typeof p === 'object' && 'is_correct' in p) {
          const pl = p as { is_correct: boolean; message?: string }
          state.isSubmitted = true
          state.submissionResult = {
            is_correct: pl.is_correct,
            correct_answer: state.currentBronzeModeQuestion?.correct_answer,
            explanation: pl.message ?? '',
          }
        } else {
          state.error = typeof action.payload === 'string' ? action.payload : String(action.payload)
        }
      })

    builder
      .addCase(fetchSilverModeQuestion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSilverModeQuestion.fulfilled, (state, action) => {
        state.loading = false
        state.currentSilverModeQuestion = action.payload
        state.currentMode = 'silver'
        state.selectedAnswer = null
        state.selectedOptionText = null
        state.isSubmitted = false
        state.submissionResult = null
      })
      .addCase(fetchSilverModeQuestion.rejected, (state, action) => {
        state.loading = false
        state.error = typeof action.payload === 'string' ? action.payload : String(action.payload)
      })
      .addCase(fetchSilverModeStatus.fulfilled, (state, action) => {
        state.silverModeStatus = action.payload
      })
      .addCase(submitSilverModeAnswer.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(submitSilverModeAnswer.fulfilled, (state, action) => {
        state.loading = false
        state.isSubmitted = true
        if (state.currentSilverModeQuestion) {
          state.currentSilverModeQuestion.is_correct = action.payload.is_correct
          state.currentSilverModeQuestion.submitted_at = action.payload.submitted_at
          state.currentSilverModeQuestion.status = 'answered'
        }
        state.submissionResult = {
          is_correct: action.payload.is_correct,
          correct_answer: state.currentSilverModeQuestion?.correct_answer,
          explanation: action.payload.message ?? '',
        }
      })
      .addCase(submitSilverModeAnswer.rejected, (state, action) => {
        state.loading = false
        const p = action.payload
        if (p && typeof p === 'object' && 'is_correct' in p) {
          const pl = p as { is_correct: boolean; message?: string }
          state.isSubmitted = true
          state.submissionResult = {
            is_correct: pl.is_correct,
            correct_answer: state.currentSilverModeQuestion?.correct_answer,
            explanation: pl.message ?? '',
          }
        } else {
          state.error = typeof action.payload === 'string' ? action.payload : String(action.payload)
        }
      })
  },
})

export const { setSelectedAnswer, setCurrentMode, clearSubmissionResult, resetTriviaUi, clearTriviaError } = triviaSlice.actions
export const triviaReducer = triviaSlice.reducer
