// Frontend API client wrapping browser fetch and handles JWT headers

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getHeaders(authRequired = true): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (authRequired) {
    const token = localStorage.getItem("transitops_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

async function request<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
  authRequired = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    method,
    headers: getHeaders(authRequired),
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, config);
  
  if (response.status === 204) {
    return {} as T;
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }
  
  return data as T;
}

export const api = {
  // --- Auth ---
  login: (credentials: any) => request<any>("/auth/login", "POST", credentials, false),
  register: (user: any) => request<any>("/auth/register", "POST", user, false),
  getMe: () => request<any>("/auth/me", "GET"),

  // --- Vehicles ---
  getVehicles: (status?: string, type?: string, region?: string) => {
    let query = "";
    const params = [];
    if (status) params.push(`status=${status}`);
    if (type) params.push(`type=${type}`);
    if (region) params.push(`region=${region}`);
    if (params.length > 0) query = `?${params.join("&")}`;
    return request<any[]>(`/vehicles${query}`, "GET");
  },
  getVehicleDispatchPool: () => request<any[]>("/vehicles/dispatch-pool", "GET"),
  createVehicle: (vehicle: any) => request<any>("/vehicles", "POST", vehicle),
  updateVehicle: (id: string, vehicle: any) => request<any>(`/vehicles/${id}`, "PUT", vehicle),
  retireVehicle: (id: string) => request<void>(`/vehicles/${id}`, "DELETE"),

  // --- Drivers ---
  getDrivers: (status?: string) => {
    const query = status ? `?status_filter=${status}` : "";
    return request<any[]>(`/drivers${query}`, "GET");
  },
  getDriverDispatchPool: () => request<any[]>("/drivers/dispatch-pool", "GET"),
  getExpiringLicenses: (days = 30) => request<any[]>(`/drivers/expiring-licenses?within_days=${days}`, "GET"),
  createDriver: (driver: any) => request<any>("/drivers", "POST", driver),
  updateDriver: (id: string, driver: any) => request<any>(`/drivers/${id}`, "PUT", driver),
  suspendDriver: (id: string) => request<void>(`/drivers/${id}`, "DELETE"),

  // --- Trips ---
  getTrips: () => request<any[]>("/trips", "GET"),
  calculateDistance: (source: string, destination: string) => 
    request<number>(`/trips/calculate-distance?source=${source}&destination=${destination}`, "GET"),
  createTrip: (trip: any) => request<any>("/trips", "POST", trip),
  dispatchTrip: (id: string) => request<any>(`/trips/${id}/dispatch`, "POST"),
  completeTrip: (id: string, completionData: any) => request<any>(`/trips/${id}/complete`, "POST", completionData),
  cancelTrip: (id: string) => request<any>(`/trips/${id}/cancel`, "POST"),

  // --- Maintenance ---
  getMaintenanceLogs: () => request<any[]>("/maintenance", "GET"),
  createMaintenanceLog: (log: any) => request<any>("/maintenance", "POST", log),
  closeMaintenanceLog: (id: string, solution?: string) => {
    const query = solution ? `?solution=${encodeURIComponent(solution)}` : "";
    return request<any>(`/maintenance/${id}/close${query}`, "POST");
  },

  // --- Fuel & Expense ---
  getFuelLogs: () => request<any[]>("/fuel-logs", "GET"),
  createFuelLog: (log: any) => request<any>("/fuel-logs", "POST", log),
  getExpenses: () => request<any[]>("/expenses", "GET"),
  createExpense: (expense: any) => request<any>("/expenses", "POST", expense),
  getVehicleOperationalCost: (vehicleId: string) => request<any>(`/vehicles/${vehicleId}/operational-cost`, "GET"),

  // --- Dashboard & Reports ---
  getKPIs: (region?: string, type?: string) => {
    let query = "";
    const params = [];
    if (region) params.push(`region=${region}`);
    if (type) params.push(`type=${type}`);
    if (params.length > 0) query = `?${params.join("&")}`;
    return request<any>(`/dashboard/kpis${query}`, "GET");
  },
  getRegions: () => request<string[]>("/dashboard/regions", "GET"),
  getVehicleSummaryReport: (region?: string, type?: string) => {
    let query = "";
    const params = [];
    if (region) params.push(`region=${region}`);
    if (type) params.push(`type=${type}`);
    if (params.length > 0) query = `?${params.join("&")}`;
    return request<any[]>(`/reports/vehicle-summary${query}`, "GET");
  },
  exportReportsCSV: async (region?: string, type?: string): Promise<void> => {
    const params = [];
    if (region) params.push(`region=${region}`);
    if (type) params.push(`type=${type}`);
    const query = params.length > 0 ? `?${params.join("&")}` : "";
    const url = `${API_BASE_URL}/reports/export.csv${query}`;
    const token = localStorage.getItem("transitops_token");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("CSV export failed");
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "transitops_report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  // --- Activity Monitor ---
  getActivityLogs: (filters: any) => {
    const params = [];
    if (filters.user_id) params.push(`user_id=${filters.user_id}`);
    if (filters.entity_type) params.push(`entity_type=${filters.entity_type}`);
    if (filters.action) params.push(`action=${filters.action}`);
    if (filters.start_date) params.push(`start_date=${filters.start_date}`);
    if (filters.end_date) params.push(`end_date=${filters.end_date}`);
    if (filters.page) params.push(`page=${filters.page}`);
    if (filters.limit) params.push(`limit=${filters.limit}`);
    
    const query = params.length > 0 ? `?${params.join("&")}` : "";
    return request<any>(`/activity-logs${query}`, "GET");
  },
  getExportActivityCSVUrl: (filters: any) => {
    const params = [];
    if (filters.user_id) params.push(`user_id=${filters.user_id}`);
    if (filters.entity_type) params.push(`entity_type=${filters.entity_type}`);
    if (filters.action) params.push(`action=${filters.action}`);
    if (filters.start_date) params.push(`start_date=${filters.start_date}`);
    if (filters.end_date) params.push(`end_date=${filters.end_date}`);
    
    const query = params.length > 0 ? `?${params.join("&")}` : "";
    return `${API_BASE_URL}/activity-logs/export${query}`;
  },

  // --- Seed Data Catalogs ---
  getCatalogLocations: () => request<any[]>("/catalogs/locations", "GET"),
  getCatalogVehicleTypes: () => request<any[]>("/catalogs/vehicle-types", "GET"),
  getCatalogMaintenanceIssues: () => request<any[]>("/catalogs/maintenance-issues", "GET"),
  getCatalogMaintenanceSolutions: () => request<any[]>("/catalogs/maintenance-solutions", "GET"),
  getCatalogLicenseCategories: () => request<any[]>("/catalogs/license-categories", "GET"),
  getCatalogFuelPrices: () => request<any[]>("/catalogs/fuel-prices", "GET"),
};
