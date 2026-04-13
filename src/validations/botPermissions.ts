import { MessageFlags, PermissionResolvable } from "discord.js";
import { ExecutionContext, Validation } from "../types";
import { isReplyableInteraction } from "../utils/interactionUtils.js";

export const botPermissions: Validation = {
  name: "botPermissions",
  
  async execute(ctx: ExecutionContext): Promise<boolean> {
    const { interaction, args } = ctx;
    
    if (!interaction.guild || !args?.permissions?.length) {
      return true;
    }

    const me = await interaction.guild.members.fetchMe();
    const permissions = args.permissions as PermissionResolvable[];
    
    const missing = permissions.filter(perm =>
      !me.permissions.has(perm)
    );

    if (missing.length > 0) {
      if (isReplyableInteraction(interaction)) {
        await interaction.reply({ 
          content: `I need the following permissions: ${missing.join(", ")}`, 
          flags: MessageFlags.Ephemeral 
        });
      }
      return false;
    }

    return true;
  }
};