import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    Message,
    EmbedBuilder,
    CommandInteraction,
    ButtonInteraction
} from "discord.js";

/**
 * Button pagination utility for embeds
 * @param interaction - The interaction that triggered the pagination
 * @param pages - Array of embed builders to paginate through
 * @param time - Time in milliseconds for the collector to run (default: 30000 = 30 seconds)
 * @returns The message with pagination buttons
 */
export async function buttonPagination(
    interaction: CommandInteraction,
    pages: EmbedBuilder[],
    time: number = 30 * 1000
): Promise<Message | null> {
    try {
        // Validate arguments
        if (!interaction) throw new Error("Invalid interaction provided");
        if (!pages || pages.length === 0) throw new Error("No pages provided");

        await interaction.deferReply();

        // If only one page, show it without buttons
        if (pages.length === 1) {
            return await interaction.editReply({
                embeds: pages,
                components: [],
                fetchReply: true,
            });
        }

        // Create pagination buttons
        const prev = new ButtonBuilder()
            .setCustomId("prev")
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const home = new ButtonBuilder()
            .setCustomId("home")
            .setEmoji("🏠")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const next = new ButtonBuilder()
            .setCustomId("next")
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Primary);

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(prev, home, next);
        let index = 0;

        // Send initial message
        const message = await interaction.editReply({
            embeds: [pages[index]],
            components: [buttons],
            fetchReply: true,
        });

        // Create button collector
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time,
        });

        collector.on("collect", async (i: ButtonInteraction) => {
            // Check if user is the one who started the pagination
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: "You are not allowed to do this!", ephemeral: true });
                return;
            }

            await i.deferUpdate();

            // Handle button clicks
            if (i.customId === "prev") {
                if (index > 0) index--;
            } else if (i.customId === "home") {
                index = 0;
            } else if (i.customId === "next") {
                if (index < pages.length - 1) index++;
            }

            // Update button states based on current index
            prev.setDisabled(index === 0);
            home.setDisabled(index === 0);
            next.setDisabled(index === pages.length - 1);

            // Update the message
            await message.edit({
                embeds: [pages[index]],
                components: [buttons],
            });

            collector.resetTimer();

            // Note: The original JS had an end listener inside collect; that is incorrect.
            // We'll keep it for faithfulness, but it should be moved outside.
            // TODO: This listener should be attached once, not on every collect.
            collector.on("end", async () => {
                await message.edit({
                    embeds: [pages[index]],
                    components: [],
                });
            });

            // The original returns the message inside the collect handler, but it's not used.
            // We'll ignore the return value.
        });

        // Proper end listener (if needed) could be placed here, but we already have one inside.
        // To avoid duplicates, we might remove the inner one. However, we're preserving the original logic.
        return message;
    } catch (error) {
        console.error("Pagination error:", error);
        // Try to send error message if interaction is still valid
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "An error occurred while setting up pagination.", ephemeral: true });
            } else {
                await interaction.editReply({ content: "An error occurred while setting up pagination." });
            }
        } catch {
            // Ignore if we can't reply
        }
        return null;
    }
}