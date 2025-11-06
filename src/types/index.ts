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

// Re-export all types from type definition files
export * from "./authTypes";
export * from "./categoryTypes";
export * from "./jockTypes";
export * from "./mediaTypes";
export * from "./optionTypes";
export * from "./postTypes";
export * from "./stationTypes";
export * from "./topBannerTypes";
