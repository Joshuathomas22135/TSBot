import { EmbedBuilder, Guild } from "discord.js";
import { mConfig } from "@/config";
import { ModerationModel } from "@/database";
import { Modal } from "@/types";
import { HexToColor } from "@/utils/color";
import { parseDuration } from "@/utils/moderationUtils";

export default {
    customId: "tempBanMdl",
    run: async ({ client, interaction }) => {
        const { message, guildId, guild, fields } = interaction;

        const targetId = interaction.customId.split('_')[1];
        const targetMember = await guild?.members.fetch(targetId);

        if (!targetMember) {
            await interaction.reply({ content: "Target member not found.", flags: 64 });
            return;
        }

        const banTime = fields.getTextInputValue("tempbanTime");
        const banReason = fields.getTextInputValue("tempbanReason");

        const banDuration = parseDuration(banTime);
        if (!Number.isFinite(banDuration) || banDuration <= 0) {
            await interaction.reply({ content: "Invalid ban duration. Please use a valid format (e.g., 10m, 2h, 1d).", flags: 64 });
            return;
        }

        const banEndTime = Math.floor((Date.now() + banDuration) / 1000);

        const bEmbed = new EmbedBuilder()
            .setAuthor({
                name: `${targetMember?.user.username}`,
                iconURL: `${targetMember?.user.displayAvatarURL()}`,
            })
            .setDescription(`${targetMember?.user.username} has been temporarily banned for ${banReason}! **(Ban will end: <t:${banEndTime}:R>)**`);

        await interaction.deferReply({ ephemeral: false });

        const targetUserId = targetMember?.id;
        if (!targetUserId) {
            await interaction.editReply({ content: "Could not identify target member ID." });
            return;
        }

        const banGuilds: Guild[] = [];

        try {
            await targetMember?.ban({ reason: `Temporarily banned for ${banReason} | Check logs for time` });
            if (guild) banGuilds.push(guild);
        } catch (error) {
            console.error(`Failed to ban member ${targetId}:`, error);
            await interaction.editReply({ content: "Failed to ban the target member. Please check my permissions and try again." }).catch(() => null);
            return;
        }

        const maxTimeoutDuration = 2147483647;
        const scheduleUnbanForGuild = (unbanGuild: Guild) => {
            if (banDuration <= maxTimeoutDuration) {
                setTimeout(async () => {
                    await unbanGuild.members.unban(targetId).catch((error) => {
                        console.error(`Failed to unban ${targetId} in guild ${unbanGuild.id}:`, error);
                    });
                }, banDuration);
            } else {
                const remainingBanDuration = banDuration - maxTimeoutDuration;

                setTimeout(async () => {
                    if (remainingBanDuration > 0) {
                        setTimeout(async () => {
                            await unbanGuild.members.unban(targetId).catch((error) => {
                                console.error(`Failed to unban ${targetId} in guild ${unbanGuild.id}:`, error);
                            });
                        }, remainingBanDuration);
                    } else {
                        await unbanGuild.members.unban(targetId).catch((error) => {
                            console.error(`Failed to unban ${targetId} in guild ${unbanGuild.id}:`, error);
                        });
                    }
                }, maxTimeoutDuration);
            }
        };

        const followUpMessage = await interaction.followUp({ embeds: [bEmbed] });
        const followUpMessageId = followUpMessage.id;

        let dataMG = await ModerationModel.find({ MultiGuilded: true });

        if (dataMG) {
            let i;
            for (i = 0; i < dataMG.length; i++) {
                const { GuildID, LogChannelID } = dataMG[i];

                if (!GuildID || !LogChannelID) continue;
                if (GuildID === interaction.guildId) continue;

                const externalGuild = client.guilds.cache.get(GuildID);
                if (!externalGuild) continue;

                const clientUserId = client.user?.id;
                if (!clientUserId) continue;

                const externalLogChannel = externalGuild.channels.cache.get(LogChannelID);
                const externalBot = await externalGuild.members.fetch(clientUserId).catch(() => null);
                if (!externalBot) continue;

                try {
                    if (!targetMember?.id) continue;

                    const externalMember = await externalGuild.members.fetch(targetMember.id).catch(() => null);
                    if (!externalMember) continue;

                    const externalMemberHighest = externalMember.roles.highest.position;
                    const externalBotHighest = externalBot.roles.highest.position;

                    if (externalMemberHighest >= externalBotHighest) {
                        continue;
                    }

                    await externalGuild.bans.create(externalMember, {
                        reason: "Automatic Multi Guilded Ban"
                    });

                    banGuilds.push(externalGuild);

                    const lEmbed = new EmbedBuilder()
                        .setColor(HexToColor(mConfig.embedColorSuccess))
                        .setTitle("`⛔` User Temp Banned")
                        .setAuthor({
                            name: externalMember.user.username,
                            iconURL: externalMember.user.displayAvatarURL(),
                        })
                        .setDescription(`\`💡\` To unban ${externalMember.user.username}, use \`/unban ${externalMember.user.id}\`.`)
                        .addFields(
                            {
                                name: "Tempbanned by",
                                value: `<@${interaction.user.id}> for ${banReason}! **(Ban will end on: <t:${banEndTime}:R>)**`,
                                inline: true,
                            },
                            {
                                name: "Reason",
                                value: `Automatic multi-guilded temp ban.`,
                                inline: true,
                            }
                        )
                        .setFooter({
                            iconURL: `${client.user?.displayAvatarURL()}`,
                            text: `${client.user?.username} - Logging system`,
                        });

                    if (externalLogChannel && 'send' in externalLogChannel) {
                        await externalLogChannel.send({ embeds: [lEmbed] });
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        banGuilds.forEach(scheduleUnbanForGuild);

    },
    options: {
        userPermissions: ["BanMembers"],
        botPermissions: ["BanMembers"],
    }
} satisfies Modal;