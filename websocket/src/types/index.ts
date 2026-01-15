export interface User {
  id: string;
  username: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered';
  sentAt: Date;
}

export interface ValidateResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
