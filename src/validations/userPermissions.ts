import { Interaction, MessageFlags, PermissionResolvable } from "discord.js";
import { ExecutionContext } from "../types/ExecutionContext.ts";
import { Validation } from "../types/Validation.ts";
import { isReplyableInteraction } from "../utils/interactionUtils.ts";

export const userPermissions: Validation = {
    name: "userPermissions",

    async execute(ctx: ExecutionContext): Promise<boolean> {
        const { interaction, args } = ctx;

        // Ensure we are in a guild and have permissions to check
        if (!interaction.inGuild() || !args?.permissions?.length) {
            return true;
        }

        // Use interaction.memberPermissions which is safer
        const memberPerms = interaction.memberPermissions;
        if (!memberPerms) {
            // If somehow memberPermissions is missing, treat as failure
            if (isReplyableInteraction(interaction)) {
                await interaction.reply({
                    content: "Could not verify your permissions.",
                    flags: MessageFlags.Ephemeral
                });
            }
            return false;
        }

        const permissions = args.permissions as PermissionResolvable[];
        const missing = permissions.filter(perm => !memberPerms.has(perm));

        if (missing.length > 0) {
            if (isReplyableInteraction(interaction)) {
                await interaction.reply({
                    content: `You need the following permissions: ${missing.join(", ")}`,
                    flags: MessageFlags.Ephemeral
                });
            }
            return false;
        }

        return true;
    }
};