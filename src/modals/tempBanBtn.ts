import { EmbedBuilder } from "discord.js";
import { mConfig } from "@/config";
import { ModerationModel } from "@/database";
import { Modal } from "@/types";
import { HexToColor } from "@/utils/color";
import { parseDuration } from "@/utils/moderationUtils";

export default {
    customId: "tempBanMdl",
    run: async ({ client, interaction }) => {
        const { message, guildId, guild, fields } = interaction;

        const embedAuthor = message?.embeds[0].author;
        const guildMembers = await guild?.members.fetch({
            query: embedAuthor?.name,
            limit: 1,
        });
        const targetMember = guildMembers?.first();

        const banTime = fields.getTextInputValue("tempbanTime");
        const banReason = fields.getTextInputValue("tempbanReason");

        const banDuration = parseDuration(banTime);
        const banEndTime = Math.floor((Date.now() + banDuration) / 1000);

        const bEmbed = new EmbedBuilder()
            .setAuthor({
                name: `${targetMember?.user.username}`,
                iconURL: `${targetMember?.user.displayAvatarURL()}`,
            })
            .setDescription(`${targetMember?.user.username} has been temporarily banned for ${banReason}! **(Ban will end: <t:${banEndTime}:R>)**`);

        await interaction.deferReply({ ephemeral: false });

        const targetId = targetMember?.id;
        if (!targetId) {
            await interaction.editReply({ content: "Could not identify target member ID." });
            return;
        }

        try {
            await targetMember?.ban({ reason: `Temporarily banned for ${banReason} | Check logs for time` });
        } catch (error) {
            console.error(`Failed to ban member ${targetId}:`, error);
            return;
        }

        const maxTimeoutDuration = 2147483647;
        if (banDuration <= maxTimeoutDuration) {
            setTimeout(async () => {
                await guild?.members.unban(targetId);
            }, banDuration);
        } else {
            const remainingBanDuration = banDuration - maxTimeoutDuration;

            setTimeout(async () => {
                // Chain second timeout after first completes
                if (remainingBanDuration > 0) {
                    setTimeout(async () => {
                        await guild?.members.unban(targetId);
                    }, remainingBanDuration);
                } else {
                    await guild?.members.unban(targetId);
                }
            }, maxTimeoutDuration);
        }

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
                        reason: "Autpmatic Multi Guilded Ban"
                    });

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
                    continue
                }
            }
        }

    },
    options: {
        userPermissions: ["BanMembers"],
        botPermissions: ["BanMembers"],
    }
} satisfies Modal;