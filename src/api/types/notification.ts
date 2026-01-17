
// Type definitions for Notification System

export interface NotificationTemplate {
    id: number;
    code: string;
    name: string;
    subject: string;
    bodyTemplate: string;
    notificationChannels: string; // e.g., "email,push"
    placeholders?: Record<string, any>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationSetting {
    templateId: number;
    templateCode: string;
    templateName: string;
    isEnabled: boolean;
    preferredChannels: string; // e.g., "email"
}

export interface Notification {
    id: string; // UUID
    title: string;
    message: string;
    channel: string;
    status: string; // 'sent', 'pending', 'failed'
    sentAt: string;
    readAt?: string | null;
    metadata?: any;
    createdAt: string;
    updatedAt?: string;
}

export interface NotificationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
