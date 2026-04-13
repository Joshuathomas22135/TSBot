import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { mConfig } from '@/config';
import { ModerationModel } from '@/database';
import { Command } from '@/types';
import { HexToColor } from '@/utils/color';

export default {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Revoke a server ban.")
        .addStringOption((o) => o
            .setName("user_id")
            .setDescription("The id of the user whose ban you want to revoke.")
            .setRequired(true)
        ),

    run: async ({ client, interaction }) => {
        const userId = interaction.options.getString("user_id", true);
        const rEmbed = new EmbedBuilder();

        const dataGD = await ModerationModel.findOne({ GuildID: interaction.guild?.id });
        if (!dataGD) {
            rEmbed
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription("`❌` This server isn't configured yet.\n\n`💡` Use `/moderatesystem configure` to start configuring this server");
            return interaction.reply({ embeds: [rEmbed], ephemeral: true });
        }

        if (userId === interaction.user.id) {
            rEmbed
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription(mConfig.unableToInteractWithYourself);
            return interaction.reply({ embeds: [rEmbed], ephemeral: true });
        }

        try {
            await interaction.guild?.members.unban(userId);

            rEmbed
                .setColor(HexToColor(mConfig.embedColorSuccess))
                .setFooter({ text: `${client.user?.username} - Unban user` })
                .setDescription(`\`✅\` Successfully revoked the ban of \`${userId}\`.`);

            await interaction.reply({ embeds: [rEmbed], ephemeral: true });
        } catch (error) {
            console.error(`Failed to unban user ${userId}:`, error);

            rEmbed
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription(`\`❌\` Failed to unban user \`${userId}\`. Please ensure the ID is correct and the user is banned.`);

            await interaction.reply({ embeds: [rEmbed], ephemeral: true });
        }
    },

    options: {
        userPermissions: ["BanMembers"],
    }
} satisfies Command;