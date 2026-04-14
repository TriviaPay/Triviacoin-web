import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiService } from '../services/apiService'

export const fetchCountries = createAsyncThunk('countries/fetch', async () => {
  return apiService.fetchCountries()
})

type CountryState = { list: string[]; loading: boolean; error: string | null }

const initialState: CountryState = { list: [], loading: false, error: null }

const countrySlice = createSlice({
  name: 'countries',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to load countries'
      })
  },
})

export const countryReducer = countrySlice.reducer

