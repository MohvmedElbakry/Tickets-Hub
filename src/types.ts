
export type View = 'home' | 'events' | 'details' | 'checkout' | 'confirmation' | 'user-dashboard' | 'admin-dashboard' | 'payment-success' | 'payment-failure' | 'payment-pending';

export type PaymentState = 'idle' | 'verifying' | 'success' | 'failed' | 'pending';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'organizer' | 'admin';
  gender?: 'Male' | 'Female' | 'Prefer not to say' | string;
  created_at: string;
  age?: number;
  birthdate?: string;
  points?: number;
  instagram_username?: string;
}

export interface TicketType {
  id?: string | number;
  event_id?: string | number;
  name: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  description: string;
  sale_start: string;
  sale_end: string;
}

export interface Order {
  id: number;
  user_id: number;
  event_id: number;
  total_price: number;
  order_status: 'pending' | 'paid' | 'cancelled' | 'requested' | 'approved' | 'rejected' | 'expired' | 'invited';
  created_at: string;
  items?: OrderTicket[];
  event?: Event;
  user?: { name: string, email: string, age?: number, phone?: string };
  instagram_username?: string;
  phone?: string;
  age?: number;
  birthdate?: string;
  payment_deadline?: string;
  reserved_at?: string;
  qr_code_token?: string | null;
  is_paid?: boolean;
}

export interface OrderTicket {
  id: number;
  order_id: number;
  ticket_type_id: number;
  quantity: number;
  price_each: number;
  name?: string;
  is_used?: boolean;
  scanned_count?: number;
  status?: 'active' | 'reselling' | 'resold';
}

export interface Event {
  id?: string | number;
  title: string;
  description: string;
  location: string;
  venue: string;
  event_date: string;
  event_time: string;
  organizer_id?: string | number;
  image_url: string;
  status: 'draft' | 'published' | 'upcoming' | 'live' | 'closed';
  created_at?: string;
  ticket_types?: TicketType[];
  pre_registration_count?: number;
  // For backward compatibility with mock data and UI
  date?: string;
  time?: string;
  price?: number;
  image?: string;
  category?: string;
  organizer?: string;
  capacity?: number;
  sold?: number;
  company_name?: string;
  rules?: string;
  google_maps_url?: string;
  qr_enabled_manual?: boolean;
}

export interface PreRegistration {
  id: number;
  user_id: number;
  event_id: number;
  created_at: string;
  event?: Event;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  event_id?: number;
  type: string;
  read: boolean;
  created_at: string;
}

export interface AppConfig {
  service_fee_percent?: number;
}

export interface Voucher {
  id: number;
  code: string;
  discount_percent: number;
  max_uses: number;
  current_uses: number;
  expiration_date: string;
  status: 'active' | 'expired' | 'redeemed';
  created_by_type: 'admin' | 'points';
  created_by_id: number;
  creatorName?: string;
}

export interface PointsHistory {
  id: number;
  user_id: number;
  points: number;
  type: 'earn' | 'redeem';
  description: string;
  created_at: string;
}

export interface ResellRequest {
  id: number;
  user_id: number;
  order_ticket_id: number;
  payout_method: 'instapay' | 'vodafone';
  payout_address: string;
  amount: number;
  status: 'pending' | 'resold' | 'paid';
  created_at: string;
  userName?: string;
  paid_at?: string;
}
