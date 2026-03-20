import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class APIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', { username, password });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Client endpoints
  async getClients(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    search?: string;
    mst_id?: number;
  }) {
    const response = await this.client.get('/clients', { params });
    return response.data;
  }

  async getClient(id: number) {
    const response = await this.client.get(`/clients/${id}`);
    return response.data;
  }

  async createClient(data: any) {
    const response = await this.client.post('/clients', data);
    return response.data;
  }

  async updateClient(id: number, data: any) {
    const response = await this.client.put(`/clients/${id}`, data);
    return response.data;
  }

  async deleteClient(id: number) {
    const response = await this.client.delete(`/clients/${id}`);
    return response.data;
  }

  // MST Box endpoints
  async getMSTBoxes(params?: { skip?: number; limit?: number; status?: string }) {
    const response = await this.client.get('/mst', { params });
    return response.data;
  }

  async getMSTBox(id: number) {
    const response = await this.client.get(`/mst/${id}`);
    return response.data;
  }

  async createMSTBox(data: any) {
    const response = await this.client.post('/mst', data);
    return response.data;
  }

  async updateMSTBox(id: number, data: any) {
    const response = await this.client.put(`/mst/${id}`, data);
    return response.data;
  }

  async deleteMSTBox(id: number) {
    const response = await this.client.delete(`/mst/${id}`);
    return response.data;
  }

  // Fibre endpoints
  async getFibreRoutes() {
    const response = await this.client.get('/fibre/routes');
    return response.data;
  }

  async getFibreRoute(id: number) {
    const response = await this.client.get(`/fibre/routes/${id}`);
    return response.data;
  }

  async createFibreRoute(data: any) {
    const response = await this.client.post('/fibre/routes', data);
    return response.data;
  }

  async getFibreCores(routeId: number) {
    const response = await this.client.get(`/fibre/routes/${routeId}/cores`);
    return response.data;
  }

  // Map endpoints
  async getMapData() {
    const response = await this.client.get('/map/data');
    return response.data;
  }

  async getRouteCores(routeId: number) {
    const response = await this.client.get(`/map/route/${routeId}/cores`);
    return response.data;
  }

  async traceCustomerPath(customerId: number) {
    const response = await this.client.get(`/map/trace/customer/${customerId}`);
    return response.data;
  }

  async traceMSTPath(mstId: number) {
    const response = await this.client.get(`/map/trace/mst/${mstId}`);
    return response.data;
  }

  async traceLinkPath(linkId: number) {
    const response = await this.client.get(`/map/trace/link/${linkId}`);
    return response.data;
  }

  async detectCustomerFault(customerId: number) {
    const response = await this.client.get(`/map/fault/customer/${customerId}`);
    return response.data;
  }

  async getCustomerLoss(customerId: number) {
    const response = await this.client.get(`/map/loss/customer/${customerId}`);
    return response.data;
  }

  async disableMSTPort(mstId: number, portNumber: number, reason?: string) {
    const response = await this.client.post(`/map/mst/${mstId}/disable-port`, {
      port_number: portNumber,
      reason,
    });
    return response.data;
  }

  async connectClientToMSTFromMap(mstId: number, clientId: number, splitterPort: number) {
    const response = await this.client.post(`/map/mst/${mstId}/connect-client`, {
      client_id: clientId,
      splitter_port: splitterPort,
    });
    return response.data;
  }

  async getClosures(params?: { skip?: number; limit?: number }) {
    const response = await this.client.get('/map/closures', { params });
    return response.data;
  }

  async createClosure(data: any) {
    const response = await this.client.post('/map/closures', data);
    return response.data;
  }

  async updateClosure(id: number, data: any) {
    const response = await this.client.put(`/map/closures/${id}`, data);
    return response.data;
  }

  async getOLTs(params?: { skip?: number; limit?: number }) {
    const response = await this.client.get('/map/olts', { params });
    return response.data;
  }

  async createOLT(data: any) {
    const response = await this.client.post('/map/olts', data);
    return response.data;
  }

  async updateOLT(id: number, data: any) {
    const response = await this.client.put(`/map/olts/${id}`, data);
    return response.data;
  }

  async getNetworkLinks(params?: { skip?: number; limit?: number }) {
    const response = await this.client.get('/map/links', { params });
    return response.data;
  }

  async createNetworkLink(data: any) {
    const response = await this.client.post('/map/links', data);
    return response.data;
  }

  async updateNetworkLink(id: number, data: any) {
    const response = await this.client.put(`/map/links/${id}`, data);
    return response.data;
  }

  // Activity endpoints
  async getActivities(params?: { skip?: number; limit?: number }) {
    const response = await this.client.get('/activity', { params });
    return response.data;
  }

  async getRecentActivities(limit: number = 20) {
    const response = await this.client.get('/activity/recent', { params: { limit } });
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardStats() {
    const response = await this.client.get('/dashboard/stats');
    return response.data;
  }

  // Network endpoints
  async getNetworkDevices(params?: { skip?: number; limit?: number; status?: string }) {
    const response = await this.client.get('/network/devices', { params });
    return response.data;
  }

  async createNetworkDevice(data: any) {
    const response = await this.client.post('/network/devices', data);
    return response.data;
  }

  async updateNetworkDevice(id: number, data: any) {
    const response = await this.client.put(`/network/devices/${id}`, data);
    return response.data;
  }

  async rebootNetworkDevice(id: number) {
    const response = await this.client.post(`/network/devices/${id}/reboot`);
    return response.data;
  }

  async getNetworkDeviceTraffic(id: number) {
    const response = await this.client.get(`/network/devices/${id}/traffic`);
    return response.data;
  }

  // Billing endpoints
  async getBillingPayments(params?: { skip?: number; limit?: number; status?: string; client_id?: number }) {
    const response = await this.client.get('/billing/payments', { params });
    return response.data;
  }

  async createBillingPayment(data: any) {
    const response = await this.client.post('/billing/payments', data);
    return response.data;
  }

  async updateBillingPayment(id: number, data: any) {
    const response = await this.client.put(`/billing/payments/${id}`, data);
    return response.data;
  }

  async markBillingPaymentPaid(id: number) {
    const response = await this.client.post(`/billing/payments/${id}/mark-paid`);
    return response.data;
  }

  async getBillingSummary() {
    const response = await this.client.get('/billing/summary');
    return response.data;
  }

  // Ticket endpoints
  async getTickets(params?: { skip?: number; limit?: number; status?: string; priority?: string }) {
    const response = await this.client.get('/tickets', { params });
    return response.data;
  }

  async createTicket(data: any) {
    const response = await this.client.post('/tickets', data);
    return response.data;
  }

  async updateTicket(id: number, data: any) {
    const response = await this.client.put(`/tickets/${id}`, data);
    return response.data;
  }

  async assignTicket(id: number, assignedToUserId: number) {
    const response = await this.client.post(`/tickets/${id}/assign`, {
      assigned_to_user_id: assignedToUserId,
    });
    return response.data;
  }

  async resolveTicket(id: number, resolutionNotes: string) {
    const response = await this.client.post(`/tickets/${id}/resolve`, {
      resolution_notes: resolutionNotes,
    });
    return response.data;
  }

  async getTicketSummary() {
    const response = await this.client.get('/tickets/summary');
    return response.data;
  }

  // Seed data
  async seedDemoData() {
    const response = await this.client.post('/seed/demo');
    return response.data;
  }

  async seedEnhancedMVP() {
    const response = await this.client.post('/seed/enhanced-mvp');
    return response.data;
  }
}

export const api = new APIService();

// Backward-compatible grouped APIs used by page modules.
export const clientsAPI = {
  getAll: (params?: { skip?: number; limit?: number; status?: string; search?: string; mst_id?: number }) =>
    api.getClients(params),
  getById: (id: number) => api.getClient(id),
  create: (data: any) => api.createClient(data),
  update: (id: number, data: any) => api.updateClient(id, data),
  remove: (id: number) => api.deleteClient(id),
};

export const mstAPI = {
  getAll: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.getMSTBoxes(params),
  getById: (id: number) => api.getMSTBox(id),
  create: (data: any) => api.createMSTBox(data),
  update: (id: number, data: any) => api.updateMSTBox(id, data),
  remove: (id: number) => api.deleteMSTBox(id),
  getStats: async () => {
    const boxes = await api.getMSTBoxes({ limit: 500 });
    const total = boxes.length;
    const available = boxes.filter((b: any) => b.capacity_status === 'available').length;
    const nearly_full = boxes.filter((b: any) => b.capacity_status === 'nearly_full').length;
    const full = boxes.filter((b: any) => b.capacity_status === 'full').length;
    return { total, available, nearly_full, full };
  },
};

export const fibreAPI = {
  getRoutes: async (_params?: { skip?: number; limit?: number }) => api.getFibreRoutes(),
  getRoute: (id: number) => api.getFibreRoute(id),
  getRouteCores: (routeId: number) => api.getFibreCores(routeId),
  createRoute: (data: any) => api.createFibreRoute(data),
  getStats: async () => {
    const routes = await api.getFibreRoutes();
    let total_cores = 0;
    let used_cores = 0;
    let free_cores = 0;
    let faulty_cores = 0;
    let total_distance_km = 0;

    for (const route of routes as any[]) {
      total_cores += Number(route.total_cores || 0);
      total_distance_km += Number(route.distance_meters || 0) / 1000;
      try {
        const cores = await api.getFibreCores(route.id);
        for (const core of cores as any[]) {
          if (core.status === 'used') used_cores += 1;
          if (core.status === 'free') free_cores += 1;
          if (core.status === 'faulty') faulty_cores += 1;
        }
      } catch {
        // Best-effort summary for UI card counts.
      }
    }

    return {
      total_routes: routes.length,
      total_cores,
      used_cores,
      free_cores,
      faulty_cores,
      total_distance_km,
    };
  },
};

export const mapAPI = {
  getData: () => api.getMapData(),
  traceCustomerPath: (customerId: number) => api.traceCustomerPath(customerId),
  traceMSTPath: (mstId: number) => api.traceMSTPath(mstId),
  traceLinkPath: (linkId: number) => api.traceLinkPath(linkId),
  detectCustomerFault: (customerId: number) => api.detectCustomerFault(customerId),
  getCustomerLoss: (customerId: number) => api.getCustomerLoss(customerId),
  disableMSTPort: (mstId: number, portNumber: number, reason?: string) =>
    api.disableMSTPort(mstId, portNumber, reason),
  connectClientToMST: (mstId: number, clientId: number, splitterPort: number) =>
    api.connectClientToMSTFromMap(mstId, clientId, splitterPort),
  getClosures: () => api.getClosures({ limit: 500 }),
  createClosure: (data: any) => api.createClosure(data),
  updateClosure: (id: number, data: any) => api.updateClosure(id, data),
  getOLTs: () => api.getOLTs({ limit: 500 }),
  createOLT: (data: any) => api.createOLT(data),
  updateOLT: (id: number, data: any) => api.updateOLT(id, data),
  getLinks: () => api.getNetworkLinks({ limit: 1000 }),
  createLink: (data: any) => api.createNetworkLink(data),
  updateLink: (id: number, data: any) => api.updateNetworkLink(id, data),
};

export const networkAPI = {
  getDevices: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.getNetworkDevices(params),
  createDevice: (data: any) => api.createNetworkDevice(data),
  updateDevice: (id: number, data: any) => api.updateNetworkDevice(id, data),
  rebootDevice: (id: number) => api.rebootNetworkDevice(id),
  getTraffic: (id: number) => api.getNetworkDeviceTraffic(id),
};

export const billingAPI = {
  getPayments: (params?: { skip?: number; limit?: number; status?: string; client_id?: number }) =>
    api.getBillingPayments(params),
  createPayment: (data: any) => api.createBillingPayment(data),
  updatePayment: (id: number, data: any) => api.updateBillingPayment(id, data),
  markPaid: (id: number) => api.markBillingPaymentPaid(id),
  getSummary: () => api.getBillingSummary(),
};

export const ticketsAPI = {
  getAll: (params?: { skip?: number; limit?: number; status?: string; priority?: string }) =>
    api.getTickets(params),
  create: (data: any) => api.createTicket(data),
  update: (id: number, data: any) => api.updateTicket(id, data),
  assign: (id: number, assignedToUserId: number) => api.assignTicket(id, assignedToUserId),
  resolve: (id: number, resolutionNotes: string) => api.resolveTicket(id, resolutionNotes),
  getSummary: () => api.getTicketSummary(),
};

export default api;
