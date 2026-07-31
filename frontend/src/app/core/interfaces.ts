export interface AuthResponse {
  token: string;
  expiresAt: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface CustomerRequest {
  name: string;
  email: string;
}

export interface CustomerResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface TransactionRequest {
  customerId: number;
  amount: number;
  merchant: string;
  category: string | null;
}

export interface TransactionResponse {
  id: number;
  customerId: number;
  amount: number;
  merchant: string;
  category: string | null;
  occurredAt: string;
  flagged: boolean;
  flagReason: string | null;
}

export interface FlaggedTransaction {
  transactionId: number;
  customerName: string;
  amount: number;
  merchant: string;
  reason: string;
  timestamp: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}
