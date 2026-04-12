import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ─── Thunk: fetch all transactions for the logged-in user ────────────────────
export const fetchTransactions = createAsyncThunk(
  'auth/fetchTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const apiClient = (await import('../api/client')).default;
      const res = await apiClient.get('/api/transactions');
      return res.data.transactions;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load transactions');
    }
  }
);

const initialState = {
  transactions: [],
  transactionsLoading: false,
  transactionsError: null,
};

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.transactionsLoading = true;
        state.transactionsError = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
        state.transactionsLoading = false;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.transactionsLoading = false;
        state.transactionsError = action.payload;
      });
  },
});

export const { setTransactions } = transactionSlice.actions;

export default transactionSlice.reducer;