export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Device {
  id: string;
  name: string;
  platform: string;
  osVersion: string;
  chip: string;
  agentVersion: string;
  hostname: string;
  status: "online" | "offline";
  isOnline: boolean;
  lastSeenAt?: string;
  pairedAt: string;
  allowedFolders: string[];
  capabilities: string[];
}

export interface AuditEntry {
  id: string;
  userId: string;
  deviceId?: string;
  action: string;
  parameters?: Record<string, unknown>;
  result: "pending" | "success" | "failure" | "timeout";
  errorCode?: string;
  errorMessage?: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  durationMs?: number;
}

class ApiClient {
  private baseUrl = "/api/gateway";

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("relay_token");
  }

  public setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("relay_token", token);
      document.cookie = `relay_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    }
  }

  public clearToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("relay_token");
      document.cookie = "relay_token=; path=/; max-age=0";
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/register")) {
      this.clearToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return data as T;
  }

  // Auth
  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  public async register(email: string, password: string, name?: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>("/auth/me");
  }

  public async getWsTicket(): Promise<string> {
    const data = await this.request<{ ticket: string }>("/auth/ticket", {
      method: "POST",
    });
    return data.ticket;
  }

  // Pairing
  public async createPairingCode(): Promise<{ code: string; expiresAt: string }> {
    return this.request<{ code: string; expiresAt: string }>("/pairing/create", {
      method: "POST",
    });
  }

  // Devices
  public async getDevices(): Promise<{ devices: Device[] }> {
    return this.request<{ devices: Device[] }>("/devices");
  }

  public async getDevice(id: string): Promise<{ device: Device }> {
    return this.request<{ device: Device }>(`/devices/${id}`);
  }

  public async revokeDevice(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/devices/${id}`, {
      method: "DELETE",
    });
  }

  public async updateDeviceAllowlist(id: string, allowedFolders: string[]): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/devices/${id}/allowlist`, {
      method: "PUT",
      body: JSON.stringify({ allowedFolders }),
    });
  }

  // Confirmations
  public async createConfirmation(
    deviceId: string,
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<{ confirmationId: string; expiresAt: string }> {
    return this.request<{ confirmationId: string; expiresAt: string }>("/confirmations", {
      method: "POST",
      body: JSON.stringify({ deviceId, action, params }),
    });
  }

  // Commands
  public async executeCommand<T = any>(
    deviceId: string,
    action: string,
    params: Record<string, unknown> = {},
    confirmationId?: string
  ): Promise<{ success: boolean; data?: T }> {
    return this.request<{ success: boolean; data?: T }>("/commands", {
      method: "POST",
      body: JSON.stringify({ deviceId, action, params, confirmationId }),
    });
  }

  // Audit
  public async getAuditLogs(params: {
    deviceId?: string;
    action?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ total: number; entries: AuditEntry[] }> {
    const query = new URLSearchParams();
    if (params.deviceId) query.set("deviceId", params.deviceId);
    if (params.action) query.set("action", params.action);
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.skip) query.set("skip", params.skip.toString());

    return this.request<{ total: number; entries: AuditEntry[] }>(`/audit?${query.toString()}`);
  }
}

export const api = new ApiClient();
