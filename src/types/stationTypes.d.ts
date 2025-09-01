// Station-related types
export interface CreateStationRequest {
  name: string;
  slug: string;
  frequency: string;
  address?: string;
  locationGroup: 'luzon' | 'visayas' | 'mindanao';
  logoImage?: string; // Will be handled as file upload
  contactNumber?: string;
  email?: string;
  mapEmbedCode?: string;
  audioStreamURL?: string;
  videoStreamURL?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateStationRequest extends Partial<CreateStationRequest> {}

export type LocationGroup = 'luzon' | 'visayas' | 'mindanao';
export type StationStatus = 'active' | 'inactive';
