export interface Admin {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface PhotoObject {
  url: string;
  thumbnail_url?: string | null;
  storage_key?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
}

export interface MembershipSnapshot {
  id: string;
  plan_name: string;
  start_date: string;
  expiry_date: string;
  status: 'paid' | 'expiring_soon' | 'expired';
  remaining_days: number;
  record_origin?: string;
}

export interface Member {
  id: string;
  member_code: string;
  full_name: string;
  phone: string;
  normalized_phone: string;
  photo?: PhotoObject | null;
  joining_date?: string | null;
  joining_date_known: boolean;
  notes?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  current_membership?: MembershipSnapshot | null;
  status: 'paid' | 'expiring_soon' | 'expired';
  remaining_days: number;
}

export interface PaginatedMembers {
  items: Member[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Plan {
  id: string;
  name: string;
  duration_unit: 'month' | 'day';
  duration_value: number;
  price: number;
  currency: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  member_id: string;
  member_code_snapshot: string;
  member_name_snapshot: string;
  membership_id?: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other';
  reference?: string | null;
  status: 'completed' | 'voided';
  record_origin: 'regular' | 'legacy';
  void_reason?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedPayments {
  items: Payment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  total_amount_collected: number;
}

export interface Attendance {
  id: string;
  member_id: string;
  member_code_snapshot: string;
  member_name_snapshot: string;
  check_in_at_utc: string;
  check_in_local_date: string;
  check_in_local_time: string;
  membership_status_at_checkin: string;
  is_expired_warning: boolean;
  created_by: string;
}

export interface PaginatedAttendance {
  items: Attendance[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UpcomingRenewalItem {
  member_id: string;
  member_code: string;
  full_name: string;
  phone: string;
  plan_name: string;
  expiry_date: string;
  remaining_days: number;
  status: 'paid' | 'expiring_soon' | 'expired';
  photo_url?: string | null;
}

export interface ExpiredCheckinItem {
  attendance_id: string;
  member_id: string;
  member_code: string;
  full_name: string;
  check_in_time: string;
  expiry_date?: string | null;
  days_expired: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  label: string;
  amount: number;
}

export interface DashboardSummary {
  total_members: number;
  paid_members: number;
  expiring_soon_members: number;
  expired_members: number;
  new_registrations_this_month: number;
  collections_this_month: number;
  today_attendance_count: number;
  upcoming_renewals: UpcomingRenewalItem[];
  recent_payments: Payment[];
  expired_checkins_today: ExpiredCheckinItem[];
  revenue_chart: MonthlyRevenuePoint[];
}

export interface Settings {
  id: string;
  gym_name: string;
  logo_url?: string | null;
  timezone: string;
  currency: string;
  country_calling_code: string;
  member_code_prefix: string;
  attendance_enabled: boolean;
  duplicate_checkin_window_minutes: number;
  expired_checkin_policy: 'warn' | 'block';
  date_format: string;
  updated_at: string;
}

export interface RenewalPreview {
  member_id: string;
  member_code: string;
  member_name: string;
  current_expiry_date?: string | null;
  calculated_start_date: string;
  calculated_expiry_date: string;
  plan_name: string;
  amount: number;
  is_extended_from_expiry: boolean;
}

export interface LegacyImportPreviewRow {
  row_number: number;
  member_code: string;
  full_name: string;
  phone: string;
  joining_date?: string | null;
  expiry_date?: string | null;
  payment_amount?: number | null;
  payment_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  is_valid: boolean;
  errors: string[];
}

export interface LegacyImportPreview {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_codes: string[];
  rows: LegacyImportPreviewRow[];
}
