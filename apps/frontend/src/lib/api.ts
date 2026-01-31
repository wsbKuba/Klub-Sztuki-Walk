import axios, { type AxiosInstance, type AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

// Utwórz instancję axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor - dołącz token do każdego żądania
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor - auto-refresh tokenu przy 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Jeśli 401 i nie próbowaliśmy jeszcze odświeżyć
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Ponów oryginalne żądanie z nowym tokenem
        const token = localStorage.getItem('accessToken');
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } else {
        // Nie udało się odświeżyć - wyloguj
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Funkcja odświeżania tokenu
async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    localStorage.setItem('accessToken', response.data.accessToken);
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }

    return true;
  } catch {
    return false;
  }
}

// ===== AUTH API =====
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post('/auth/change-password', {
      oldPassword: currentPassword,
      newPassword,
    });
    return response.data;
  },
};

// ===== USERS API =====
export const usersAPI = {
  getMe: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  updateMe: async (data: { firstName?: string; lastName?: string; phone?: string }) => {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  },
};

// ===== SUBSCRIPTIONS API =====
export const subscriptionsAPI = {
  getMy: async () => {
    const response = await apiClient.get('/subscriptions/my');
    return response.data;
  },

  createCheckoutSession: async (classTypeId: string) => {
    const response = await apiClient.post('/subscriptions/checkout', { classTypeId });
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await apiClient.post(`/subscriptions/${id}/cancel`);
    return response.data;
  },

  reactivate: async (id: string) => {
    const response = await apiClient.post(`/subscriptions/${id}/reactivate`);
    return response.data;
  },

  createCustomerPortalSession: async () => {
    const response = await apiClient.post('/subscriptions/customer-portal');
    return response.data;
  },
};

// ===== CLASSES API =====
export const classesAPI = {
  getAll: async () => {
    const response = await apiClient.get('/classes');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/classes/${id}`);
    return response.data;
  },
};

// ===== SCHEDULE API =====
export const scheduleAPI = {
  getAll: async () => {
    const response = await apiClient.get('/schedule');
    return response.data;
  },

  get: async (dayOfWeek?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (dayOfWeek !== undefined) params.append('dayOfWeek', dayOfWeek.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/schedule?${params.toString()}`);
    return response.data;
  },

  create: async (data: {
    classTypeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => {
    const response = await apiClient.post('/schedule', data);
    return response.data;
  },

  update: async (id: string, data: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
  }) => {
    const response = await apiClient.patch(`/schedule/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/schedule/${id}`);
    return response.data;
  },

  cancel: async (id: string, data: { date: string; reason?: string }) => {
    const response = await apiClient.post(`/schedule/${id}/cancel`, data);
    return response.data;
  },
};

// ===== NEWS API =====
export const newsAPI = {
  getAll: async (type?: string) => {
    const params = type ? `?type=${type}` : '';
    const response = await apiClient.get(`/news${params}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/news/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    content: string;
    type: 'announcement' | 'event' | 'cancellation';
    coverImageUrl?: string;
  }) => {
    const response = await apiClient.post('/news', data);
    return response.data;
  },

  update: async (id: string, data: {
    title?: string;
    content?: string;
    type?: 'announcement' | 'event' | 'cancellation';
    coverImageUrl?: string;
  }) => {
    const response = await apiClient.patch(`/news/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/news/${id}`);
    return response.data;
  },
};

// ===== PAYMENTS API =====
export const paymentsAPI = {
  getMy: async () => {
    const response = await apiClient.get('/payments/my');
    return response.data;
  },
};

// ===== MEMBERS API =====
export const membersAPI = {
  getAll: async (classTypeId?: string) => {
    const params = classTypeId ? `?classTypeId=${classTypeId}` : '';
    const response = await apiClient.get(`/members${params}`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/members/stats');
    return response.data;
  },
};

// ===== ADMIN API =====
export const adminAPI = {
  getTrainers: async () => {
    const response = await apiClient.get('/admin/trainers');
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  createTrainer: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    password?: string;
  }) => {
    const response = await apiClient.post('/admin/trainers', data);
    return response.data;
  },

  updateTrainer: async (id: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    const response = await apiClient.patch(`/admin/trainers/${id}`, data);
    return response.data;
  },

  deactivateTrainer: async (id: string) => {
    const response = await apiClient.patch(`/admin/trainers/${id}/deactivate`);
    return response.data;
  },

  activateTrainer: async (id: string) => {
    const response = await apiClient.patch(`/admin/trainers/${id}/activate`);
    return response.data;
  },

  resetTrainerPassword: async (id: string) => {
    const response = await apiClient.post(`/admin/trainers/${id}/reset-password`);
    return response.data;
  },
};

export default apiClient;
