import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";
import { Button } from "@/types";

export default {
    customId: "punishmentBtn",
    run: async ({ client, interaction }) => {
        const { message, channel, guildId, guild, user } = interaction;

        await interaction.deferReply({ ephemeral: false });

        try {
            const embedAuthor = message.embeds[0]?.author;
            const guildMembers = await guild?.members.fetch({
                query: embedAuthor?.name,
                limit: 1
            });
            const targetMember = guildMembers?.first();

            const Oembed = new EmbedBuilder()
                .setTitle("Punishments")
                .setAuthor({
                    name: `${targetMember?.user.username}`,
                    iconURL: `${targetMember?.user.displayAvatarURL()}`,
                })
                .setDescription(`\`❓\` What punishment do you want to use against ${targetMember?.user.username}?`);

            const otherRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("banBtn")
                    .setLabel("Server ban")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("kickBtn")
                    .setLabel("Server kick")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("tempMuteBtn")
                    .setLabel("Temp Mute")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("tempBanBtn")
                    .setLabel("Temp Ban")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("cancelBtn")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.editReply({ embeds: [Oembed], components: [otherRow] });

        } catch (error) {
            console.error("Error in punishmentBtn:", error);
        }
    },
} satisfies Button;