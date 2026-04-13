export interface MessageConfig {
  embedColorSuccess: string;
  embedColorWarning: string;
  embedColorError: string;
  embedErrorMessage: string;

  commandDevOnly: string;
  commandTestMode: string;
  commandPremiumOnly: string;

  userNoPermissions: string;
  botNoPermissions: string;

  hasHigherRolePosition: string;
  unableToInteractWithYourself: string;

  cannotUseButton: string;
  cannotUseSelect: string;

  footerText: string;
}

export interface SuspiciousUsersConfig {
  ids: string[];
}



// Audit config types
export interface AuditLogEntry {
  event: string;
  value: number;
}

export type StringMap = Record<string, string>;

export interface AuditConfig {
  auditLogList: AuditLogEntry[];

  locales: StringMap;
  permissions: StringMap;
  channelTypes: StringMap;
  systemChannelFlags: StringMap;
  channelFlags: StringMap;
  archiveDuration: StringMap;
  eventPrivacyLevel: StringMap;
  guildMemberFlags: StringMap;
  triggerTypes: StringMap;
  eventTypes: StringMap;
  timeoutDuration: StringMap;

  eventStatus: string[];
  eventEntityTypes: string[];
  verificationLevels: string[];
  explicitContentFilterLevels: string[];
  premiumTiers: string[];
  stickerTypes: string[];
  stickerFormats: string[];
  actionTypes: string[];
  keywordPresetTypes: string[];
  webhookTypes: string[];
}

export interface AppConfig {
  messages: MessageConfig;
  suspiciousUsers: SuspiciousUsersConfig;
  auditConfig: AuditConfig
}