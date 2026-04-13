import { ExecutionContext, Validation } from "@/types"
import { isReplyableInteraction } from "../utils/interactionUtils.js";

export const guildOnly: Validation = {
    name: "guildOnly",

    async execute(ctx: ExecutionContext): Promise<boolean> {
        const { interaction } = ctx;

        // Check if the interaction is in a guild
        if (!interaction.inGuild()) {
            if (isReplyableInteraction(interaction)) {
                await interaction.reply({
                    content: "This command can only be used in a server.",
                    flags: 64
                });
            }
            return false;
        }

        return true;
    }
};