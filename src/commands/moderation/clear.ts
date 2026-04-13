import { SlashCommandBuilder, EmbedBuilder, TextChannel, Message } from "discord.js";
import { mConfig } from "@/config";
import { Command } from "@/types";
import { HexToColor } from "@/utils/color";
import { Logger } from "@/utils/logger";

export default {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Deletes a specific number of messages provided.")
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("Amount of messages to delete from the channel.")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Messages to be deleted from a specific user in a channel.")
        ),

    run: async ({ client, interaction }) => {
        let amount = interaction.options.getInteger("amount", true);
        const target = interaction.options.getUser("target");

        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = interaction.channel;
            if (!channel || !channel.isTextBased() || !('bulkDelete' in channel)) {
                await interaction.editReply({ content: "This command can only be used in a text channel." });
                return;
            }
            const textChannel = channel as TextChannel;

            const channelMessages = await textChannel.messages.fetch({ limit: amount });

            if (channelMessages.size === 0) {
                return await interaction.editReply({
                    content: "There are no messages in this channel to delete.",
                });
            }

            if (amount > channelMessages.size) amount = channelMessages.size;

            const clearEmbed = new EmbedBuilder().setColor(HexToColor(mConfig.embedColorSuccess));

            let messagesToDelete: Message[] = [];

            if (target) {
                channelMessages.forEach((m) => {
                    if (m.author.id === target.id && messagesToDelete.length < amount) {
                        messagesToDelete.push(m);
                    }
                });

                if (messagesToDelete.length === 0) {
                    return await interaction.editReply({
                        content: `No messages from ${target} found in the recent fetch. Try increasing the fetch range.`,
                    });
                }

                const multiMsg = messagesToDelete.length === 1 ? "message" : "messages";
                clearEmbed.setDescription(
                    `\`✅\` Successfully cleared \`${messagesToDelete.length}\` ${multiMsg} from ${target} in ${textChannel}.`
                );
            } else {
                messagesToDelete = channelMessages.first(amount) as Message[];
                const multiMsg = messagesToDelete.length === 1 ? "message" : "messages";
                clearEmbed.setDescription(
                    `\`✅\` Successfully cleared \`${messagesToDelete.length}\` ${multiMsg} in ${textChannel}.`
                );
            }

            if (messagesToDelete.length > 0) {
                await textChannel.bulkDelete(messagesToDelete, true);
            }

            await interaction.editReply({ embeds: [clearEmbed] });
        } catch (error) {
            const logger = new Logger();
            logger.error('COMMAND', `Error clearing messages in /clear command: ${error instanceof Error ? error.message : 'Unknown error'}`);

            // Safely respond based on whether the interaction was acknowledged
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({
                    content: "An error occurred while clearing the messages.",
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: "An error occurred while clearing the messages.",
                    ephemeral: true,
                });
            }
        }
    },

    options: {
        userPermissions: ["ManageMessages"],
        botPermissions: ["ManageMessages"],
    },
} satisfies Command;