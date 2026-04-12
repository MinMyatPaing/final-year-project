import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import transactionReducer from './transactionSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    transaction: transactionReducer,
  },
});

export default store;
