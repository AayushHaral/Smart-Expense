export const EXPENSE_CATEGORIES = [
  'Food',
  'Shopping',
  'Transport',
  'Bills',
  'Entertainment',
  'Health',
  'Education',
  'Travel',
  'Other'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Other'
];

export const SUBCATEGORIES_MAP = {
  Food: ['Groceries', 'Dining Out', 'Coffee & Snacks', 'Fast Food', 'Delivery'],
  Shopping: ['Clothing', 'Electronics', 'Home & Garden', 'Personal Care', 'Gifts'],
  Transport: ['Fuel/Gas', 'Taxi/Cab', 'Public Transit', 'Maintenance', 'Parking'],
  Bills: ['Electricity', 'Internet', 'Water', 'Mobile Recharge', 'Rent', 'Gas Utility'],
  Entertainment: ['Movies', 'Gaming', 'Streaming Subscriptions', 'Concerts/Events'],
  Health: ['Pharmacy', 'Doctor Visit', 'Fitness/Gym', 'Health Insurance', 'Medical Tests'],
  Education: ['Tuition/School', 'Books & Supplies', 'Online Courses', 'Certifications'],
  Travel: ['Flights', 'Hotels', 'Car Rental', 'Sightseeing'],
  Salary: ['Regular Pay', 'Bonus', 'Overtime', 'Commission'],
  Freelance: ['Client Project', 'Consulting', 'Contract Work'],
  Business: ['Sales Revenue', 'Product Sales', 'Refunds'],
  Investment: ['Dividends', 'Stock Gains', 'Crypto', 'Mutual Funds'],
  Gift: ['Birthday', 'Holiday', 'Cash Gift'],
  Other: ['Miscellaneous', 'Uncategorized']
};

export const RECURRING_TYPES = [
  { label: 'Rent', category: 'Bills', subcategory: 'Rent' },
  { label: 'Electricity', category: 'Bills', subcategory: 'Electricity' },
  { label: 'Internet', category: 'Bills', subcategory: 'Internet' },
  { label: 'Subscriptions', category: 'Entertainment', subcategory: 'Streaming Subscriptions' },
  { label: 'Loan Payments', category: 'Bills', subcategory: 'Miscellaneous' },
  { label: 'Insurance', category: 'Health', subcategory: 'Health Insurance' },
  { label: 'Other Recurring', category: 'Other', subcategory: 'Miscellaneous' }
];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'Bank Transfer',
  'Other'
];
