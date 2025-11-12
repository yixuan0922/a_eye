// Shared TypeScript types for all microservices

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Personnel Types
export interface PersonnelCreateInput {
  name: string;
  employeeId?: string;
  department?: string;
  position?: string;
  role?: string;
  siteId: string;
  photos?: string[];
}

export interface PersonnelUpdateInput {
  name?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
  accessLevel?: string;
  isAuthorized?: boolean;
  authorizedBy?: string;
  authorizedAt?: Date;
  expiresAt?: Date;
}

// Violation Types
export interface ViolationCreateInput {
  type: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  status?: string;
  location?: string;
  siteId: string;
  cameraId?: string;
  personnelId?: string;
  imageUrl?: string;
}

// PPE Violation Types
export interface PPEViolationCreateInput {
  personName: string;
  personnelId?: string;
  confidenceScore?: number;
  siteId: string;
  cameraId?: string;
  cameraName: string;
  location?: string;
  previousState: string;
  currentState: string;
  ppeWearing: Record<string, boolean>;
  ppeMissing: Record<string, boolean>;
  ppeRequired: Record<string, boolean>;
  violationReason: string;
  severity?: 'low' | 'medium' | 'high';
  detectionTimestamp: Date;
  snapshotUrl?: string;
  snapshotMetadata?: any;
  gracePeriodStart?: Date;
  gracePeriodEnd?: Date;
}

// Unauthorized Access Types
export interface UnauthorizedAccessCreateInput {
  trackId: number;
  siteId: string;
  cameraId?: string;
  cameraName: string;
  location: string;
  detectionTimestamp: Date;
  durationSeconds: number;
  totalFramesTracked: number;
  faceDetectionAttempts: number;
  snapshotUrl?: string;
  bbox?: number[];
  severity?: 'low' | 'medium' | 'high';
}

export interface UnauthorizedAccessUpdateInput {
  status?: 'active' | 'resolved' | 'ignored';
  severity?: 'low' | 'medium' | 'high';
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  identifiedPersonName?: string;
  identifiedPersonnelId?: string;
}

// Camera Types
export interface CameraCreateInput {
  name: string;
  location: string;
  ipAddress?: string;
  streamUrl?: string;
  siteId: string;
}

export interface CameraUpdateInput {
  name?: string;
  location?: string;
  ipAddress?: string;
  streamUrl?: string;
  status?: 'online' | 'offline' | 'maintenance';
  isActive?: boolean;
}

// Attendance Types
export interface AttendanceCreateInput {
  siteId: string;
  cameraId: string;
  personnelId: string;
  confidence: number;
  timestamp?: Date;
}

// Site Types
export interface SiteCreateInput {
  name: string;
  location: string;
  code: string;
  description?: string;
}

export interface SiteUpdateInput {
  name?: string;
  location?: string;
  description?: string;
  isActive?: boolean;
  qrCode?: string;
}

// Query Parameters
export interface ViolationQueryParams {
  siteId: string;
  status?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}

export interface AttendanceQueryParams {
  siteId: string;
  personnelId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}
