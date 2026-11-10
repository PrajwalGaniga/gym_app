import {
  Admin,
  Member,
  PaginatedMembers,
  Plan,
  Payment,
  PaginatedPayments,
  Attendance,
  PaginatedAttendance,
  DashboardSummary,
  Settings,
  RenewalPreview,
  LegacyImportPreview,
  WalletReportResponse,
  PortalCheckInResponse,
  PortalGymInfo
} from './types';

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // When running in the browser in production (e.g. on sinan-gym.vercel.app), default to live Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://gym-app-tdsj.onrender.com/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach token for cross-domain auth fallback (Vercel -> Render)
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('gym_auth_token') || localStorage.getItem('gym_auth_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends and receives HttpOnly cookies
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData && errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
      }
    } catch {
      // not JSON
    }
    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const text = await response.text();
    return text as unknown as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (credentials: { phone?: string; pin?: string; username?: string; password?: string }) => {
    const res = await request<{ access_token: string; admin: Admin }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (typeof window !== 'undefined' && res && res.access_token) {
      sessionStorage.setItem('gym_auth_token', res.access_token);
      localStorage.setItem('gym_auth_token', res.access_token);
    }
    return res;
  },

  logout: async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('gym_auth_token');
      localStorage.removeItem('gym_auth_token');
    }
    return request<{ message: string }>('/auth/logout', { method: 'POST' });
  },

  getMe: () => request<Admin>('/auth/me'),

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),

  // Members
  getMembers: (params?: { category?: string; search?: string; archived?: boolean; page?: number; page_size?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.archived !== undefined) q.set('archived', String(params.archived));
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));
    return request<PaginatedMembers>(`/members?${q.toString()}`);
  },

  searchMembers: (query: string, limit: number = 10) =>
    request<Member[]>(`/members/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getMemberDetail: (id: string) => request<Member>(`/members/${id}`),

  createMember: (data: any) =>
    request<Member>('/members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createLegacyMember: (data: any) =>
    request<Member>('/members/legacy', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMember: (id: string, data: any) =>
    request<Member>(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  archiveMember: (id: string) =>
    request<Member>(`/members/${id}/archive`, {
      method: 'POST',
    }),

  restoreMember: (id: string) =>
    request<Member>(`/members/${id}/restore`, {
      method: 'POST',
    }),

  uploadMemberPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>(`/members/${id}/photo`, {
      method: 'POST',
      body: formData,
    });
  },

  removeMemberPhoto: (id: string) =>
    request<{ message: string }>(`/members/${id}/photo`, {
      method: 'DELETE',
    }),

  deleteMember: (id: string) =>
    request<{ message: string; id: string }>(`/members/${id}`, {
      method: 'DELETE',
    }),

  getMemberPayments: (id: string, page = 1, pageSize = 20) =>
    request<PaginatedPayments>(`/members/${id}/payments?page=${page}&page_size=${pageSize}`),

  getMemberAttendance: (id: string, page = 1, pageSize = 20) =>
    request<PaginatedAttendance>(`/members/${id}/attendance?page=${page}&page_size=${pageSize}`),

  // Memberships & Renewal
  previewRenewal: (memberId: string, planId: string, paymentDate?: string, customStartDate?: string) => {
    const q = new URLSearchParams({ member_id: memberId, plan_id: planId });
    if (paymentDate) q.set('payment_date', paymentDate);
    if (customStartDate) q.set('custom_start_date', customStartDate);
    return request<RenewalPreview>(`/memberships/preview-renewal?${q.toString()}`);
  },

  renewMembership: (memberId: string, data: any) =>
    request<any>(`/memberships/${memberId}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  migrateExpiryDate: (memberId: string, data: { new_expiry_date: string; reason: string }) =>
    request<any>(`/memberships/${memberId}/migrate-expiry`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Payments
  getPayments: (params?: { member_id?: string; status?: string; start_date?: string; end_date?: string; payment_method?: string; search?: string; page?: number; page_size?: number }) => {
    const q = new URLSearchParams();
    if (params?.member_id) q.set('member_id', params.member_id);
    if (params?.status) q.set('status', params.status);
    if (params?.start_date) q.set('start_date', params.start_date);
    if (params?.end_date) q.set('end_date', params.end_date);
    if (params?.payment_method) q.set('payment_method', params.payment_method);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));
    return request<PaginatedPayments>(`/payments?${q.toString()}`);
  },

  createPayment: (data: any) =>
    request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  voidPayment: (paymentId: string, reason: string) =>
    request<Payment>(`/payments/${paymentId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  exportPaymentsCsv: (params?: { start_date?: string; end_date?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.set('start_date', params.start_date);
    if (params?.end_date) q.set('end_date', params.end_date);
    if (params?.status) q.set('status', params.status);
    return request<string>(`/payments/export?${q.toString()}`);
  },

  // Attendance
  checkIn: (memberId: string, overridePolicy: boolean = false) =>
    request<Attendance>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId, override_policy: overridePolicy }),
    }),

  getTodayAttendance: (page = 1, pageSize = 20) =>
    request<PaginatedAttendance>(`/attendance/today?page=${page}&page_size=${pageSize}`),

  // Plans
  getPlans: () => request<Plan[]>('/plans'),

  createPlan: (data: any) =>
    request<Plan>('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlan: (id: string, data: any) =>
    request<Plan>(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Reports
  getCollectionsReport: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    return request<any>(`/reports/collections?${q.toString()}`);
  },

  getWalletReport: (period = '30d') =>
    request<WalletReportResponse>(`/reports/wallet?period=${encodeURIComponent(period)}`),

  getMembersReport: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    return request<any>(`/reports/members?${q.toString()}`);
  },

  getAttendanceReport: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    return request<any>(`/reports/attendance?${q.toString()}`);
  },

  exportAttendanceCsv: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    return request<string>(`/reports/attendance/export?${q.toString()}`);
  },

  // Settings
  getSettings: () => request<Settings>('/settings'),

  updateSettings: (data: any) =>
    request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Legacy Imports
  downloadImportTemplate: () => request<string>('/imports/template'),

  previewImportCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<LegacyImportPreview>('/imports/preview', {
      method: 'POST',
      body: formData,
    });
  },

  commitImportCsv: (rows: any[]) =>
    request<any>('/imports/commit', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),

  // Public Member Check-In Portal
  getPortalGymInfo: () => request<PortalGymInfo>('/portal/gym-info'),

  portalLogin: (data: { member_code: string; phone_last_2: string }) =>
    request<PortalCheckInResponse>('/portal/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  portalCheckIn: (data: {
    member_code: string;
    phone_last_2: string;
    latitude?: number | null;
    longitude?: number | null;
  }) =>
    request<PortalCheckInResponse>('/portal/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

