import { GuildMember, MessageFlags } from "discord.js";
import { ExecutionContext, Validation } from "../types";
import { isReplyableInteraction } from "../utils/interactionUtils.js";
import { mConfig } from "@/config/index.js";

export const devOnly: Validation = {
  name: "devOnly",
  
  async execute(ctx: ExecutionContext): Promise<boolean> {
    const { interaction, handler } = ctx;
    
    if (!interaction.inGuild()) {
      if (isReplyableInteraction(interaction)) {
        await interaction.reply({ 
          content: "This command can only be used in a server.", 
          flags: MessageFlags.Ephemeral 
        });
      }
      return false;
    }

    const member = interaction.member as GuildMember;
    const handlerOptions = handler.getOptions();
    const devUserIds = handlerOptions.devUserIds || [];
    const devRoleIds = handlerOptions.devRoleIds || [];

    const isDev = devUserIds.includes(member.id) ||
                  member.roles.cache.some(role => devRoleIds.includes(role.id));

    if (!isDev) {
      if (isReplyableInteraction(interaction)) {
        await interaction.reply({ 
          content: `${mConfig.commandDevOnly}`, 
          flags: MessageFlags.Ephemeral 
        });
      }
      return false;
    }

    return true;
  }
};