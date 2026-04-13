import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
} from "discord.js";
import { mConfig } from "@/config/index.js";
import { ModerationModel } from "@/database/index.js";
import { Command } from "@/types/index.js";
import { HexToColor } from "@/utils/color.js";
import { logger } from "@/utils/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName("moderate")
        .setDescription("Moderate a server member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The server member you want to moderate.")
                .setRequired(true)
        ),

    run: async ({ client, interaction }) => {
        if (!interaction.guild) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                flags: 64,
            });
            return;
        }

        const targetUser = interaction.options.getUser("user", true);


        let targetMember: GuildMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch (err) {
            await interaction.reply({
                content: "Could not find that member in this server.",
                flags: 64,
            });
            return;
        }

        const executor = interaction.member as GuildMember;

        let config;
        try {
            config = await ModerationModel.findOne({ GuildID: interaction.guild?.id });

        } catch (dbError) {
            await interaction.reply({
                content: "An error occurred while checking server configuration.",
                flags: 64,
            });
            return;
        }


        if (!config) {
            const embed = new EmbedBuilder()
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription(
                    "`❌` This server isn't configured yet.\n\n" +
                    "`💡` Use `/moderatesystem configure` to start configuring this server"
                );
            await interaction.reply({ embeds: [embed], flags: 64 });
            return;
        }


        // Cannot moderate self
        if (targetMember.id === executor.id) {
            const embed = new EmbedBuilder()
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription(mConfig.unableToInteractWithYourself || "You cannot interact with yourself.");
            await interaction.reply({ embeds: [embed], flags: 64 });
            return;
        }

        // Role hierarchy check
        if (targetMember.roles.highest.position >= executor.roles.highest.position) {
            const embed = new EmbedBuilder()
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription(mConfig.hasHigherRolePosition || "You cannot moderate this user due to role hierarchy.");
            await interaction.reply({ embeds: [embed], flags: 64 });
            return;
        }

        // Build buttons
        const moderationButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`punishmentBtn_${targetMember.id}`)
                .setEmoji("👟")
                .setLabel("Punishments")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`otherBtn_${targetMember.id}`)
                .setLabel("Utility")
                .setEmoji("📋")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cancelBtn_${targetMember.id}`)
                .setEmoji("❌")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
        );

        const rEmbed = new EmbedBuilder()
            .setColor("#FFFFFF")
            .setFooter({ text: `${client.user?.username} - Moderate user` })
            .setAuthor({
                name: targetMember.user.username,
                iconURL: targetMember.user.displayAvatarURL({ extension: 'png', size: 1024 }),
            })
            .setDescription(
                `\`❔\` What action do you want to use against ${targetMember.user.username}?`
            );

        await interaction.reply({
            embeds: [rEmbed],
            components: [moderationButtons],
            ephemeral: true,
        });
    },

    options: {
        userPermissions: ["ModerateMembers"]
    }
} satisfies Command;