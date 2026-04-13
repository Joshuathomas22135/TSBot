import { loadConfig } from "./loader.ts";

export const config = loadConfig();

/* Optional named exports if you like shortcuts */
export const mConfig = config.messages;
export const suspiciousUsers = config.suspiciousUsers;
export const auditConfig = config.auditConfig

export type {
    MessageConfig,
    SuspiciousUsersConfig,
    AuditConfig
} from "./types"
