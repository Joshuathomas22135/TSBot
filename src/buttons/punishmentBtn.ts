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

        await interaction.deferReply({ ephemeral: true });

        try {
            const targetId = interaction.customId.split('_')[1];
            const targetMember = await guild?.members.fetch(targetId);

            const Oembed = new EmbedBuilder()
                .setTitle("Punishments")
                .setAuthor({
                    name: `${targetMember?.user.username}`,
                    iconURL: `${targetMember?.user.displayAvatarURL()}`,
                })
                .setDescription(`\`❓\` What punishment do you want to use against ${targetMember?.user.username}?`);

            const otherRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`banBtn_${targetId}`)
                    .setLabel("Server ban")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`kickBtn_${targetId}`)
                    .setLabel("Server kick")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`tempMuteBtn_${targetId}`)
                    .setLabel("Temp Mute")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`tempBanBtn_${targetId}`)
                    .setLabel("Temp Ban")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`cancelBtn_${targetId}`)
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.editReply({ embeds: [Oembed], components: [otherRow] });

        } catch (error) {
            console.error("Error in punishmentBtn:", error);
            await interaction.followUp({ content: "An error occurred while processing the punishment.", ephemeral: true });
        }
    },
} satisfies Button;