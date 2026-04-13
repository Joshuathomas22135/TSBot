import { PermissionResolvable } from "discord.js";

export interface Options {
  deleted?: boolean;
  devOnly?: boolean;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  premiumOnly?: Boolean;
  guildOnly?: Boolean;
}