import { EmbedBuilder, GuildMember, Message, PermissionFlagsBits } from "discord.js";
import { ModerationModel } from "@/database";
import { mConfig } from "@/config";
import { Button } from "@/types";
import { HexToColor } from "@/utils/color";
import { IModeration } from "@/database/types";
import { logger } from "@/utils/logger";

export default {
    customId: "kickBtn",
    run: async ({ interaction, client }) => {
        const { message, channel, guild, guildId, user } = interaction;

        const targetId = interaction.customId.split('_')[1];
        const targetMember = await guild?.members.fetch(targetId);

        if (!targetMember) {
            const errorEmbed = new EmbedBuilder()
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription("`❌` Target member not found.");
            await message.edit({ embeds: [errorEmbed] });
            setTimeout(() => message.delete(), 2000);
            return;
        }

        const rEmbed = new EmbedBuilder()
            .setColor("#ffffff")
            .setFooter({ text: `${client.user?.username} - Moderate User` })
            .setAuthor({
                name: `${targetMember?.user.username}`,
                iconURL: targetMember?.user.displayAvatarURL()
            })
            .setDescription(`\`❔\` What is the reason to kick ${targetMember?.user.username}?\n\`❕\` You have 15 seconds to reply. After this time the moderation will be automatically cancelled.\n\n\`💡\` To continue without a reason, answer with \`-\`.\n\`💡\` To cancel the moderation, answer with \`cancel\`.`)

        message.edit({ embeds: [rEmbed] });

        const filter = (m: Message) => m.author.id === user.id;
        const reasonCollector = await (channel as any)?.awaitMessages({ filter, max: 1, time: 15_000, errors: ["time"] })
            .then((collected) => {
                const response = collected.first();
                const content = response?.content.trim() ?? "";
                const normalized = content.toLowerCase();

                if (!response || normalized === "" || normalized === "cancel") {
                    response?.delete().catch(() => null);
                    rEmbed
                        .setColor(HexToColor(mConfig.embedColorError))
                        .setDescription("`❌` Moderation cancelled.");
                    message.edit({ embeds: [rEmbed] });
                    setTimeout(() => {
                        message.delete();
                    }, 2_000);
                    return null;
                }

                if (content.length > 1024) {
                    response?.delete().catch(() => null);
                    rEmbed
                        .setColor(HexToColor(mConfig.embedColorError))
                        .setDescription("`❌` Reason is too long. Please provide a reason under 1024 characters.");
                    message.edit({ embeds: [rEmbed] });
                    setTimeout(() => {
                        message.delete();
                    }, 2_000);
                    return null;
                }

                return response;
            })
            .catch(() => {
                rEmbed
                    .setColor(HexToColor(mConfig.embedColorError))
                    .setDescription("`❌` Moderation cancelled.");
                message.edit({ embeds: [rEmbed] });
                setTimeout(() => {
                    message.delete();
                }, 2_000);
                return null;
            });

        const reasonObj = reasonCollector?.first();
        let reason = reasonObj?.content;

        if (!reason) return;

        if (reasonObj.content === "-") reason = "No reason specified";

        reasonObj.delete();

        // Level 2
        let dataMG = await ModerationModel.find({ MultiGuilded: true }) as IModeration[];
        const invokerId = user.id;

        if (dataMG) {
            let i;
            for (i = 0; i < dataMG.length; i++) {
                const { GuildID, LogChannelID } = dataMG[i];
                if (GuildID === guildId || !GuildID || !LogChannelID) continue;

                const externalGuild = client.guilds.cache.get(GuildID);
                if (!externalGuild) continue;

                const externalLogChannel = externalGuild.channels.cache.get(LogChannelID) as any;
                const externalBot = await externalGuild.members.fetch(client.user!.id).catch(() => null);
                const externalInvoker = await externalGuild.members.fetch(invokerId).catch(() => null);

                if (!externalInvoker) continue;
                if (externalGuild.ownerId !== externalInvoker.id && !externalInvoker.permissions.has(PermissionFlagsBits.KickMembers)) continue;
                if (!externalBot) continue;

                try {
                    const externalMember = await externalGuild.members.fetch(targetMember.id).catch(() => null);

                    if (!externalMember) continue;

                    if (externalMember.roles.highest.position >= externalBot.roles.highest.position) {
                        continue;
                    }

                    await externalGuild.members.kick(externalMember, "Automatic multi guilded kick");

                    const lEmbed = new EmbedBuilder()
                        .setColor("White")
                        .setTitle("`👢` User kicked")
                        .setAuthor({
                            name: externalMember.user.username,
                            iconURL: externalMember.user.displayAvatarURL(),
                        })
                        .setDescription(
                            `\`💡\` ${externalMember.user.username} has been kicked from this server.`
                        )
                        .addFields(
                            {
                                name: "Kicked by",
                                value: `<@${client.user?.id}>`,
                                inline: true,
                            },
                            {
                                name: "Reason",
                                value: "`Automatic multi-guilded kick.`",
                                inline: true,
                            }
                        )
                        .setFooter({
                            iconURL: `${client.user?.displayAvatarURL()}`,
                            text: `${client.user?.username} - Logging system`,
                        });

                    await (externalLogChannel as any)?.send({ embeds: [lEmbed] });
                } catch (err) {
                    logger.error(
                        "BUTTON",
                        `Multi-guild kick failure in guild ${GuildID} for target ${targetMember.id}: ${(err as Error).message}\n${(err as Error).stack ?? ""}`
                    );
                    continue;
                }
            }

            try {
                await targetMember.kick(reason);
            } catch (err) {
                logger.error(
                    "BUTTON",
                    `Failed to kick target ${targetMember.id} in guild ${guildId}: ${(err as Error).message}\n${(err as Error).stack ?? ""}`
                );
                const errorEmbed = new EmbedBuilder()
                    .setColor(HexToColor(mConfig.embedColorError))
                    .setDescription("`❌` Failed to kick the member. Please check role hierarchy and permissions.");
                await message.edit({ embeds: [errorEmbed] });
                return;
            }

            const dataGD = await ModerationModel.findOne({ GuildID: guildId });
            const logChannel = dataGD?.LogChannelID ? guild?.channels.cache.get(dataGD.LogChannelID) as any : null;

            const lEmbed = new EmbedBuilder()
                .setColor(HexToColor("FFFFFF"))
                .setTitle("`❌` User Kicked")
                .setAuthor({
                    name: targetMember.user.username,
                    iconURL: targetMember.user.displayAvatarURL(),
                })
                .setDescription(
                    `\`💡\` ${targetMember.user.username} has been kicked from the server.`
                )
                .addFields(
                    { name: "Kicked by", value: `<@${user.id}>`, inline: true },
                    { name: "Reason", value: `${reason}`, inline: true }
                )
                .setFooter({
                    iconURL: client.user?.displayAvatarURL(),
                    text: `${client.user?.username} - Logging system`,
                });

            if (logChannel) {
                try {
                    await logChannel.send({ embeds: [lEmbed] });
                } catch (err) {
                    logger.error(
                        "BUTTON",
                        `Failed to send kick log to channel ${dataGD?.LogChannelID} in guild ${guildId}: ${(err as Error).message}\n${(err as Error).stack ?? ""}`
                    );
                }
            }

            rEmbed
                .setColor(HexToColor(mConfig.embedColorSuccess))
                .setDescription(`\`✅\` Successfully kicked ${targetMember.user.username}.`);

            await message.edit({ embeds: [rEmbed] });
            setTimeout(() => {
                message.delete();
            }, 2_000);
        }

    },
    options: {
        userPermissions: ["KickMembers"],
    }
} satisfies Button;