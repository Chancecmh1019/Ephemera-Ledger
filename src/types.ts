export interface RecordData {
  id: string;
  line_user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  note: string;
  payment_method: 'cash' | 'credit_card';
  created_at: string;
  is_urgent?: boolean;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}
