export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  version: string;
}

export interface AppInfo {
  message: string;
  version: string;
  status: string;
}

// Re-export option types
export * from "./optionTypes";
