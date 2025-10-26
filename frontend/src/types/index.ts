export type Role = 'USER' | 'PROVIDER' | 'ADMIN';

export type JobStatus =
  | 'DRAFT'
  | 'DISPATCHING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELED';

export type AttemptOutcome = 'IGNORED' | 'REJECTED' | 'ACCEPTED' | 'EXPIRED';

export type PaymentStatus = 'INITIATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon?: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  bio?: string;
  categories: Category[];
  ratingAvg: number;
  ratingCount: number;
  availability?: any;
  latitude: number;
  longitude: number;
  user?: User;
  name?: string;
}

export interface Job {
  id: string;
  userId: string;
  providerId?: string;
  categoryId: string;
  category?: Category;
  details: string;
  slotStart: string;
  slotEnd: string;
  latitude: number;
  longitude: number;
  status: JobStatus;
  dispatchOrder?: string[];
  createdAt: string;
  updatedAt: string;
  user?: User;
  provider?: ProviderProfile;
  payment?: Payment;
  reviews?: Review[];
}

export interface DispatchAttempt {
  id: string;
  jobId: string;
  providerId: string;
  rank: number;
  sentAt: string;
  respondedAt?: string;
  outcome?: AttemptOutcome;
  provider?: ProviderProfile;
  job?: Job;
}

export interface Payment {
  id: string;
  jobId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  providerPayoutCents?: number;
  createdAt: string;
}

export interface Review {
  id: string;
  jobId: string;
  userId: string;
  providerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user?: User;
}

export interface DispatchProgress {
  jobId: string;
  currentRank: number;
  totalProviders: number;
  attempts: DispatchAttempt[];
  status: 'active' | 'accepted' | 'completed' | 'failed';
  secondsRemaining?: number;
}
