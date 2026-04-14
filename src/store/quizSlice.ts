import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_TIMER } from '../lib/utils'
import type { Question } from '../lib/utils'

export type QuizStatus = 'idle' | 'inProgress' | 'finished' | 'review'

export type QuizState = {
  questions: Question[]
  currentQuestion: number
  selectedAnswer: string | null
  answers: (string | null)[]
  score: number
  correctCount: number
  timer: number
  quizStatus: QuizStatus
  lastAnswerCorrect: boolean | null
}

const QUESTION_TIME = DEFAULT_TIMER

const initialState: QuizState = {
  questions: [],
  currentQuestion: 0,
  selectedAnswer: null,
  answers: [],
  score: 0,
  correctCount: 0,
  timer: QUESTION_TIME,
  quizStatus: 'idle',
  lastAnswerCorrect: null,
}

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    startQuiz: (state, action: PayloadAction<Question[]>) => {
      state.questions = action.payload
      state.currentQuestion = 0
      state.selectedAnswer = null
      state.answers = new Array(action.payload.length).fill(null)
      state.score = 0
      state.correctCount = 0
      state.timer = QUESTION_TIME
      state.quizStatus = 'inProgress'
      state.lastAnswerCorrect = null
    },
    selectAnswer: (state, action: PayloadAction<string>) => {
      if (state.selectedAnswer || state.quizStatus !== 'inProgress') return
      const current = state.questions[state.currentQuestion]
      if (!current) return
      const picked = action.payload
      const isCorrect = current.options.find((opt) => opt.id === picked)?.isCorrect ?? false
      state.selectedAnswer = picked
      state.answers[state.currentQuestion] = picked
      state.lastAnswerCorrect = isCorrect
      if (isCorrect) {
        state.correctCount += 1
        state.score += 100
      }
    },
    tick: (state) => {
      if (state.quizStatus !== 'inProgress') return
      state.timer = Math.max(state.timer - 1, 0)
    },
    nextQuestion: (state) => {
      if (state.currentQuestion + 1 >= state.questions.length) {
        state.quizStatus = 'finished'
        return
      }
      state.currentQuestion += 1
      state.selectedAnswer = state.quizStatus === 'review' ? state.answers[state.currentQuestion] : null
      state.timer = QUESTION_TIME
      state.lastAnswerCorrect = null
    },
    prevQuestion: (state) => {
      if (state.currentQuestion > 0) {
        state.currentQuestion -= 1
        state.selectedAnswer = state.answers[state.currentQuestion]
      }
    },
    finishQuiz: (state) => {
      state.quizStatus = 'finished'
    },
    setQuizStatus: (state, action: PayloadAction<QuizStatus>) => {
      state.quizStatus = action.payload
      if (action.payload === 'review') {
        state.currentQuestion = 0
        state.selectedAnswer = state.answers[0]
      }
    },
    resetQuiz: () => initialState,
  },
})

export const { startQuiz, selectAnswer, tick, nextQuestion, prevQuestion, finishQuiz, setQuizStatus, resetQuiz } = quizSlice.actions
export const quizReducer = quizSlice.reducer
export const QUESTION_DURATION = QUESTION_TIME
