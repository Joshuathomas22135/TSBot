import messageConfigJson from "./json/messageConfig.json"
import suspiciousUsersJson from "./json/suspiciousUsers.json"
import auditConfigJson from "./json/auditConfig.json"

import { AppConfig, SuspiciousUsersConfig, AuditConfig, MessageConfig } from "./types"

export function loadConfig(): AppConfig {
  return {
    messages: messageConfigJson as MessageConfig,
    suspiciousUsers: suspiciousUsersJson as SuspiciousUsersConfig,
    auditConfig: auditConfigJson as AuditConfig
  }
}

