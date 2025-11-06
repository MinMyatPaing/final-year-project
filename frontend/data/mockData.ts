import { Transaction, SpendingCategory, MonthlySpending, User } from '@/types/budgeting';

export const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
};

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-1',
    amount: 8.50,
    currency: 'GBP',
    description: 'Coffee',
    merchant: 'Starbucks',
    category: 'Eating Out',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-2',
    amount: 45.20,
    currency: 'GBP',
    description: 'Weekly Groceries',
    merchant: 'Tesco',
    category: 'Groceries',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-3',
    amount: 12.99,
    currency: 'GBP',
    description: 'Lunch',
    merchant: 'Pret A Manger',
    category: 'Eating Out',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-4',
    amount: 89.50,
    currency: 'GBP',
    description: 'Books',
    merchant: 'Waterstones',
    category: 'Shopping',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-5',
    amount: 25.00,
    currency: 'GBP',
    description: 'Bus Pass',
    merchant: 'Transport for London',
    category: 'Transport',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-6',
    amount: 67.30,
    currency: 'GBP',
    description: 'Groceries',
    merchant: 'Sainsbury\'s',
    category: 'Groceries',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-7',
    amount: 15.50,
    currency: 'GBP',
    description: 'Dinner',
    merchant: 'Nando\'s',
    category: 'Eating Out',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-8',
    amount: 34.99,
    currency: 'GBP',
    description: 'Clothing',
    merchant: 'Primark',
    category: 'Shopping',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-9',
    amount: 52.00,
    currency: 'GBP',
    description: 'Groceries',
    merchant: 'Tesco',
    category: 'Groceries',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'txn-10',
    amount: 18.75,
    currency: 'GBP',
    description: 'Train Ticket',
    merchant: 'National Rail',
    category: 'Transport',
    date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Add more transactions spread across the year
  ...generateYearlyTransactions(),
];

// Generate transactions for the past year
function generateYearlyTransactions(): Transaction[] {
  const categories = ['Groceries', 'Shopping', 'Eating Out', 'Transport'];
  const merchants: Record<string, string[]> = {
    'Groceries': ['Tesco', 'Sainsbury\'s', 'Asda', 'Morrisons', 'Waitrose'],
    'Shopping': ['Amazon', 'Primark', 'H&M', 'Argos', 'Boots'],
    'Eating Out': ['McDonald\'s', 'Nando\'s', 'Pret A Manger', 'Starbucks', 'Wagamama'],
    'Transport': ['Transport for London', 'National Rail', 'Uber', 'Bolt'],
  };
  
  const transactions: Transaction[] = [];
  const now = new Date();
  
  // Generate transactions for each month of the past year
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const transactionsPerMonth = Math.floor(Math.random() * 40) + 15; // 15-55 transactions per month
    
    for (let i = 0; i < transactionsPerMonth; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const merchant = merchants[category][Math.floor(Math.random() * merchants[category].length)];
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const hour = Math.floor(Math.random() * 24);
      
      // Amounts vary by category
      let amount = 0;
      if (category === 'Groceries') {
        amount = Math.random() * 80 + 20; // £20-£100
      } else if (category === 'Shopping') {
        amount = Math.random() * 150 + 10; // £10-£160
      } else if (category === 'Eating Out') {
        amount = Math.random() * 30 + 5; // £5-£35
      } else if (category === 'Transport') {
        amount = Math.random() * 25 + 5; // £5-£30
      }
      
      const transactionDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, hour);
      if (transactionDate > now) continue; // Don't create future transactions
      
      transactions.push({
        id: `txn-${Date.now()}-${i}-${monthOffset}`,
        amount: Math.round(amount * 100) / 100,
        currency: 'GBP',
        description: category === 'Groceries' ? 'Groceries' : category === 'Eating Out' ? 'Meal' : category,
        merchant,
        category,
        date: transactionDate.toISOString(),
      });
    }
  }
  
  return transactions;
}

// Calculate spending by category
export const getSpendingByCategory = (transactions: Transaction[]): SpendingCategory[] => {
  const categoryMap = new Map<string, { total: number; count: number }>();
  
  transactions.forEach((txn) => {
    const existing = categoryMap.get(txn.category) || { total: 0, count: 0 };
    categoryMap.set(txn.category, {
      total: existing.total + txn.amount,
      count: existing.count + 1,
    });
  });
  
  const totalSpending = transactions.reduce((sum, txn) => sum + txn.amount, 0);
  
  const categoryIcons: Record<string, string> = {
    'Groceries': 'fork.knife',
    'Shopping': 'bag.fill',
    'Eating Out': 'fork.knife',
    'Transport': 'car.fill',
  };
  
  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      icon: categoryIcons[name] || 'creditcard.fill',
      totalAmount: data.total,
      transactionCount: data.count,
      percentage: (data.total / totalSpending) * 100,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
};

// Calculate monthly spending for the past year
export const getMonthlySpending = (transactions: Transaction[]): MonthlySpending[] => {
  const monthMap = new Map<string, number>();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  transactions.forEach((txn) => {
    const date = new Date(txn.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = monthMap.get(monthKey) || 0;
    monthMap.set(monthKey, existing + txn.amount);
  });
  
  const now = new Date();
  const monthlyData: MonthlySpending[] = [];
  
  // Get last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const amount = monthMap.get(monthKey) || 0;
    
    monthlyData.push({
      month: monthNames[date.getMonth()],
      amount: Math.round(amount * 100) / 100,
      fullMonth: fullMonthNames[date.getMonth()],
    });
  }
  
  return monthlyData;
};

// Calculate total spent in a time period
export const getTotalSpent = (transactions: Transaction[]): number => {
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
};

export const formatCurrency = (amount: number, currency: string = 'GBP'): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};
