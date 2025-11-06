export interface Transaction {
  id: string;
  amount: number; // Always positive, represents money spent
  currency: string;
  description: string;
  merchant?: string;
  category: string;
  date: string; // ISO date string
}

export interface SpendingCategory {
  id: string;
  name: string;
  icon: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number; // Percentage of total spending
}

export interface MonthlySpending {
  month: string; // Month abbreviation (J, F, M, etc.)
  amount: number;
  fullMonth: string; // Full month name
}

export interface Budget {
  totalBudget: number;
  currency: string;
  startDate: string;
  endDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

