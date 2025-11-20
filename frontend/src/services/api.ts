import axios, { AxiosInstance, AxiosError } from 'axios';
import { User, SecurityAlert, ThreatIntelligence, DashboardStats } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
                refresh: refreshToken,
              });
              const { access } = response.data;
              localStorage.setItem('access_token', access);
              originalRequest.headers.Authorization = `Bearer ${access}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string, rememberMe = false) {
    const response = await this.api.post('/auth/login/', { username, password, remember_me: rememberMe });
    return response.data;
  }

  async register(data: any) {
    const response = await this.api.post('/auth/register/', data);
    return response.data;
  }

  async logout(refreshToken: string) {
    const response = await this.api.post('/auth/logout/', { refresh: refreshToken });
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get('/auth/user/');
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.api.get('/dashboard/stats/');
    return response.data;
  }

  // Network endpoints
  async getNetworkTraffic(params?: any) {
    const response = await this.api.get('/network/traffic/', { params });
    return response.data;
  }

  async getProtocols() {
    const response = await this.api.get('/network/traffic/protocols/');
    return response.data;
  }

  async getConnections() {
    const response = await this.api.get('/network/traffic/connections/');
    return response.data;
  }

  // Alerts endpoints
  async getAlerts(params?: any) {
    const response = await this.api.get('/alerts/', { params });
    return response.data;
  }

  async getAlert(id: number): Promise<SecurityAlert> {
    const response = await this.api.get(`/alerts/${id}/`);
    return response.data;
  }

  async acknowledgeAlert(id: number) {
    const response = await this.api.post(`/alerts/${id}/acknowledge/`);
    return response.data;
  }

  async resolveAlert(id: number, notes?: string) {
    const response = await this.api.post(`/alerts/${id}/resolve/`, { notes });
    return response.data;
  }

  async getAlertTimeline() {
    const response = await this.api.get('/alerts/timeline/');
    return response.data;
  }

  // Threats endpoints
  async getThreats(params?: any) {
    const response = await this.api.get('/threats/', { params });
    return response.data;
  }

  async getThreat(id: number): Promise<ThreatIntelligence> {
    const response = await this.api.get(`/threats/${id}/`);
    return response.data;
  }

  async searchThreats(query: string) {
    const response = await this.api.get('/threats/search/', { params: { q: query } });
    return response.data;
  }

  // System endpoints
  async getSystemHealth() {
    const response = await this.api.get('/system/health/');
    return response.data;
  }

  async getSystemSettings() {
    const response = await this.api.get('/system/settings/');
    return response.data;
  }

  async updateSystemSettings(settings: Record<string, any>) {
    const response = await this.api.put('/system/settings/', settings);
    return response.data;
  }
}

export const apiService = new ApiService();

// Export individual services for convenience
export const authService = {
  login: (username: string, password: string, rememberMe?: boolean) =>
    apiService.login(username, password, rememberMe),
  register: (data: any) => apiService.register(data),
  logout: (refreshToken: string) => apiService.logout(refreshToken),
  getCurrentUser: () => apiService.getCurrentUser(),
};

export const dashboardService = {
  getStats: () => apiService.getDashboardStats(),
};

export const networkService = {
  getTraffic: (params?: any) => apiService.getNetworkTraffic(params),
  getProtocols: () => apiService.getProtocols(),
  getConnections: () => apiService.getConnections(),
};

export const alertsService = {
  getAlerts: (params?: any) => apiService.getAlerts(params),
  getAlert: (id: number) => apiService.getAlert(id),
  acknowledgeAlert: (id: number) => apiService.acknowledgeAlert(id),
  resolveAlert: (id: number, notes?: string) => apiService.resolveAlert(id, notes),
  getTimeline: () => apiService.getAlertTimeline(),
};

export const threatsService = {
  getThreats: (params?: any) => apiService.getThreats(params),
  getThreat: (id: number) => apiService.getThreat(id),
  searchThreats: (query: string) => apiService.searchThreats(query),
};

export const systemService = {
  getHealth: () => apiService.getSystemHealth(),
  getSettings: () => apiService.getSystemSettings(),
  updateSettings: (settings: Record<string, any>) => apiService.updateSystemSettings(settings),
};

