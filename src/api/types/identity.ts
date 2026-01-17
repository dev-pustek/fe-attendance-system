
import { PaginationParams } from "./common";
import { User } from "./user";

// --- Enums ---
export enum IdentityChannelCode {
  FACE = "FACE",
  FINGERPRINT = "FINGERPRINT",
  RFID = "RFID",
  PIN = "PIN"
}

export enum CaptureStatus {
  PROCESSED = "processed",
  FAILED = "failed",
  PENDING = "pending"
}

export enum ResolutionStatus {
  CONFIRMED = "confirmed",
  REJECTED = "rejected",
  PENDING = "pending"
}

export enum ResolutionMethod {
  AUTOMATIC = "automatic",
  MANUAL = "manual"
}

// --- Entities ---

export interface IdentityChannel {
  id: number;
  code: IdentityChannelCode | string;
  name: string;
  requiresDevice: boolean;
  isBiometric: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface IdentityCredential {
  id: string;
  userId: string;
  channelId: number;
  identifierValue: string; // Hashed or masked value
  issuedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
  user?: User;
  channel?: IdentityChannel;
}

export interface IdentityCaptureLog {
  id: string;
  deviceId: string;
  channelId: number;
  rawIdentifier: string;
  capturedAt: string;
  confidence: number;
  captureStatus: CaptureStatus | string;
  payload: Record<string, unknown> | null; // Flexible payload (width, height, etc)
  createdAt: string;
  device?: {
    public_id: string;
    deviceName: string;
    location: string | null;
    isActive: boolean;
  };
  channel?: IdentityChannel;
}

export interface IdentityResolution {
  id: string;
  captureLogId: string;
  userId: string;
  matchConfidence: number;
  resolutionStatus: ResolutionStatus | string;
  resolutionMethod: ResolutionMethod | string;
  resolvedAt: string;
  captureLog?: IdentityCaptureLog;
  user?: User;
}

// --- Request DTOs ---

export interface CreateChannelDto {
  code: string;
  name: string;
  requiresDevice: boolean;
  isBiometric: boolean;
  isActive: boolean;
}

export interface UpdateChannelDto {
  code?: string;
  name?: string;
  requiresDevice?: boolean;
  isBiometric?: boolean;
  isActive?: boolean;
}

export interface CreateCredentialDto {
  userId: string;
  channelId: number;
  identifierValue: string;
  issuedAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  maxUses?: number;
}

export interface UpdateCredentialDto {
  userId?: string;
  channelId?: number;
  identifierValue?: string;
  issuedAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  maxUses?: number;
}

export interface MatchResolutionDto {
  captureLogId: string | number;
  userId: string;
  matchConfidence: number;
  resolutionStatus: ResolutionStatus | string;
  resolutionMethod: ResolutionMethod | string;
  resolvedAt?: string;
}

export interface CreateResolutionDto {
  captureLogId: string | number;
  userId: string;
  matchConfidence: number;
  resolutionStatus: ResolutionStatus | string;
  resolutionMethod: ResolutionMethod | string;
  resolvedAt?: string;
}

export interface UpdateResolutionDto {
  captureLogId?: string | number;
  userId?: string;
  matchConfidence?: number;
  resolutionStatus?: ResolutionStatus | string;
  resolutionMethod?: ResolutionMethod | string;
  resolvedAt?: string;
}

export interface CreateCaptureLogDto {
  deviceId: string;
  channelId: number;
  rawIdentifier: string;
  capturedAt: string;
  confidence: number;
  captureStatus: CaptureStatus | string;
  payload?: Record<string, unknown>;
}

export interface UpdateCaptureLogDto {
  deviceId?: string;
  channelId?: number;
  rawIdentifier?: string;
  capturedAt?: string;
  confidence?: number;
  captureStatus?: CaptureStatus | string;
  payload?: Record<string, unknown>;
}

// --- Device Channel Capabilities ---
export interface DeviceChannelCapability {
  id: number;
  deviceId: string;
  channelId: number;
  isEnabled: boolean;
  createdAt: string;
  device?: {
    public_id: string;
    deviceName: string;
    location?: string;
    isActive: boolean;
  };
  channel?: IdentityChannel;
}

export interface CreateDeviceChannelCapabilityDto {
  deviceId: string;
  channelId: number;
  isEnabled: boolean;
}

export interface UpdateDeviceChannelCapabilityDto {
  deviceId?: string;
  channelId?: number;
  isEnabled?: boolean;
}

// --- Filter Params ---

export interface BaseIdentityParams extends PaginationParams {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ChannelParams extends BaseIdentityParams {
  isActive?: boolean;
}

export interface CredentialParams extends BaseIdentityParams {
  userId?: string;
  channelId?: number;
  isActive?: boolean;
}

export interface CaptureLogParams extends BaseIdentityParams {
  deviceId?: string;
  channelId?: number;
  captureStatus?: CaptureStatus | string;
  startDate?: string;
  endDate?: string;
}

export interface ResolutionParams extends BaseIdentityParams {
  userId?: string;
  resolutionStatus?: ResolutionStatus | string;
  resolutionMethod?: ResolutionMethod | string;
}

export interface DeviceChannelCapabilityParams extends BaseIdentityParams {
  deviceId?: string;
  channelId?: number | string;
}
