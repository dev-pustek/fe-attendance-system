export interface Backup {
  filename: string;
  size: number;
  mtime: string;
  type: string;
}

export interface BackupSettings {
  schedule: string;
  retentionDays: number;
  backupPath: string;
}

export interface UpdateBackupSettingsDto {
  schedule?: string;
  retentionDays?: number;
}
