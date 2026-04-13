import { EmbedBuilder, TextChannel } from "discord.js";
import { mConfig } from "@/config";
import { ModerationModel } from "@/database";
import { Modal } from "@/types";
import { HexToColor } from "@/utils/color";
import { parseDuration, scheduleUnmute } from "@/utils/moderationUtils";

export default {
    customId: "tempMuteMdl",
    run: async ({ client, interaction }) => {
        const { message, guildId, guild, fields } = interaction;

        // Guard: ensure guild and message exist
        if (!guild || !guildId || !message) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                flags: 64,
            });
            return;
        }

        const embedAuthor = message.embeds[0]?.author;
        if (!embedAuthor?.name) {
            await interaction.reply({
                content: "Could not identify target user.",
                flags: 64,
            });
            return;
        }

        await interaction.deferReply({ flags: 64 });

        const guildMembers = await guild.members.fetch({
            query: embedAuthor.name,
            limit: 1,
        });
        const targetMember = guildMembers.first();

        if (!targetMember) {
            await interaction.editReply({
                content: "Could not find that member in this server.",
            });
            return;
        }

        const muteTime = fields.getTextInputValue("tempMuteTime");
        const muteReason = fields.getTextInputValue("tempMuteReason");

        const muteDuration = parseDuration(muteTime);
        if (muteDuration <= 0) {
            await interaction.editReply({
                content: "Invalid mute duration. Please use a valid format (e.g., 10m, 2h, 1d).",
            });
            return;
        }

        const muteEndTime = Math.floor((Date.now() + muteDuration) / 1000);

        const mEmbed = new EmbedBuilder()
            .setColor(HexToColor(mConfig.embedColorSuccess))
            .setAuthor({
                name: targetMember.user.username,
                iconURL: targetMember.user.displayAvatarURL({ extension: 'png', size: 1024 }),
            })
            .setDescription(`${targetMember.user.username} has been temporarily muted for ${muteReason}! **(Mute will end: <t:${muteEndTime}:R>)**`);

        const config = await ModerationModel.findOne({ GuildID: guildId });
        if (!config || !config.MuteRoleID) {
            const errorEmbed = new EmbedBuilder()
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription("`❌` Moderation system is not properly configured. Please run `/moderatesystem configure` first.");
            await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
            return;
        }

        const muteRoleId = config.MuteRoleID;

        try {
            await targetMember.roles.add(muteRoleId, `Temporarily muted for ${muteReason} | Check logs for time`);
        } catch (error) {
            console.error(`Failed to mute member ${targetMember.id}:`, error);
            await interaction.followUp({
                content: "Failed to apply mute. Please check my permissions and role hierarchy.",
                flags: 64,
            });
            return;
        }

        // Schedule automatic unmute
        scheduleUnmute(targetMember, muteRoleId, muteDuration);

        // Send success message ephemerally by editing the deferred reply
        await interaction.editReply({ embeds: [mEmbed] });

        // Multi‑guild propagation
        const multiGuildConfigs = await ModerationModel.find({ MultiGuilded: true });
        for (const cfg of multiGuildConfigs) {
            if (!cfg.GuildID || !cfg.LogChannelID) continue;
            if (cfg.GuildID === guildId) continue;

            const externalGuild = client.guilds.cache.get(cfg.GuildID);
            if (!externalGuild) continue;

            // Use external guild's own mute role ID
            const externalMuteRoleId = cfg.MuteRoleID;
            if (!externalMuteRoleId) continue;

            const externalLogChannel = externalGuild.channels.cache.get(cfg.LogChannelID);
            // Logging is best‑effort; mute proceeds even without a valid log channel
            const canLog = externalLogChannel && externalLogChannel.isTextBased();

            const externalBot = await externalGuild.members.fetch(client.user!.id).catch(() => null);
            if (!externalBot) continue;

            try {
                const externalMember = await externalGuild.members.fetch(targetMember.id);
                if (!externalMember) continue;
                if (externalMember.roles.highest.position >= externalBot.roles.highest.position) continue;

                // ✅ Non‑null assertion on externalMuteRoleId for roles.add
                await externalMember.roles.add(externalMuteRoleId!, `Tempmuted for ${muteReason} | Multi‑guild`);
                // ✅ Non‑null assertion on externalMuteRoleId for scheduleUnmute
                scheduleUnmute(externalMember, externalMuteRoleId!, muteDuration);

                if (canLog) {
                    const lEmbed = new EmbedBuilder()
                        .setColor(HexToColor(mConfig.embedColorSuccess))
                        .setTitle("`⛔` User temp muted (multi‑guild)")
                        .setAuthor({
                            name: externalMember.user.username,
                            iconURL: externalMember.user.displayAvatarURL({ extension: 'png', size: 1024 }),
                        })
                        .setDescription(`\`💡\` To manually unmute ${externalMember.user.username}, use the appropriate unmute command.`)
                        .addFields(
                            { name: "Tempmuted by", value: `<@${interaction.user.id}>`, inline: true },
                            { name: "Reason", value: `Automatic multi‑guild temp mute.`, inline: true },
                            { name: "Expires", value: `<t:${muteEndTime}:R>`, inline: true }
                        )
                        .setFooter({
                            iconURL: client.user!.displayAvatarURL({ extension: 'png', size: 1024 }),
                            text: `${client.user!.username} - Logging system`,
                        });

                    await externalLogChannel.send({ embeds: [lEmbed] }).catch(() => null);
                }
            } catch (error) {
                console.error("Error in multi‑guild temp mute:", error);
                // Continue to next guild
            }
        }

        if (config.LogChannelID) {
            const logChannel = guild.channels.cache.get(config.LogChannelID);
            if (logChannel && logChannel.isTextBased()) {
                const lEmbed = new EmbedBuilder()
                    .setColor(HexToColor(mConfig.embedColorSuccess))
                    .setTitle("`⛔` User temp muted")
                    .setAuthor({
                        name: targetMember.user.username,
                        iconURL: targetMember.user.displayAvatarURL({ extension: 'png', size: 1024 }),
                    })
                    .addFields(
                        { name: "Muted by", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "Reason", value: muteReason, inline: true },
                        { name: "Expires", value: `<t:${muteEndTime}:R>`, inline: true }
                    )
                    .setFooter({
                        iconURL: client.user?.displayAvatarURL({ extension: 'png', size: 1024 }),
                        text: `${client.user?.username} - Logging system`,
                    });

                await logChannel.send({ embeds: [lEmbed] }).catch(() => null);
            }
        }

        setTimeout(async () => {
            await message.delete().catch(() => null);
        }, 2000);
    },
    options: {
        userPermissions: ["ModerateMembers"],
        botPermissions: ["ModerateMembers"],
    }
} satisfies Modal;

