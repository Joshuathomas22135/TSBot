import {
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder,
    TextChannel,
} from "discord.js";
import { Command } from "@/types";
import { ModerationModel } from "@/database";
import { mConfig, suspiciousUsers } from "@/config";
import { HexToColor } from "@/utils/color.js";

export default {
    data: new SlashCommandBuilder()
        .setName("moderationsystem")
        .setDescription("An advanced moderating system.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("configure")
                .setDescription("Configures the advanced moderating system into the server.")
                .addChannelOption(option =>
                    option
                        .setName("logging_channel")
                        .setDescription("The channel where all moderations will be logged.")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addRoleOption(option =>
                    option
                        .setName("mute_role")
                        .setDescription("The role to use for muting members")
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("ban_suspicious")
                        .setDescription("Whether to ban users from the suspicious list")
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("multi_guilded")
                        .setDescription("Adds your server on the list of allowing multi-guilded moderation.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Removes the advanced moderation system from the server.")
        ),

    run: async ({ client, interaction }) => {
        const subcmd = interaction.options.getSubcommand();
        if (!["configure", "remove"].includes(subcmd)) return;


        const rEmbed = new EmbedBuilder().setFooter({
            iconURL: client.user?.displayAvatarURL({ extension: 'png', size: 1024 }),
            text: `${client.user?.username} - Advanced Moderation System`,
        });

        if (subcmd === "configure") {
            const multiGuilded = interaction.options.getBoolean("multi_guilded");
            const muteRole = interaction.options.getRole("mute_role");
            const loggingChannel = interaction.options.getChannel("logging_channel") as TextChannel
            const banSuspicious = interaction.options.getBoolean("ban_suspicious") || false;

            let dataGD = await ModerationModel.findOne({ GuildID: interaction.guildId });

            if (!dataGD) {
                rEmbed
                    .setColor(HexToColor(mConfig.embedColorWarning))
                    .setDescription("`⌛` New server detected: Configuring the advanced moderation system...");

                await interaction.reply({ embeds: [rEmbed], ephemeral: true, fetchReply: true });

                dataGD = new ModerationModel({
                    GuildID: interaction.guild?.id,
                    MultiGuilded: multiGuilded,
                    MuteRoleID: muteRole?.id,
                    LogChannelID: loggingChannel?.id,
                    BanSuspicious: banSuspicious,
                })

                await dataGD.save();

                rEmbed
                    .setColor(HexToColor(mConfig.embedColorSuccess))
                    .setDescription("`✅` Successfully configured the advanced moderation system.")
                    .addFields(
                        {
                            name: "Multi-guilded",
                            value: `\`${multiGuilded ? "Yes" : "No"}\``,
                            inline: true,
                        },
                        {
                            name: "Mute Role",
                            value: `${muteRole}`,
                            inline: true,
                        },
                        {
                            name: "Logging Channel",
                            value: `${loggingChannel}`,
                            inline: true,
                        }
                    );

                setTimeout(async () => {
                    await interaction.editReply({ embeds: [rEmbed] });
                }, 2000)

                // Level 3
                if (banSuspicious) {
                    let i;
                    for (i = 0; i < suspiciousUsers.ids.length; i++) {
                        try {
                            const suspiciousUser = await interaction.guild?.members.fetch(
                                suspiciousUsers.ids[i]
                            );

                            if (!suspiciousUser) continue;

                            await interaction.guild?.bans.create(suspiciousUser, {
                                deleteMessageSeconds: 60 * 60 * 24 * 7,
                                reason: "Suspicious User listed by the developer.",
                            })

                            const lEmbed = new EmbedBuilder()
                                .setColor("White")
                                .setTitle("`⛔` User Banned")
                                .setAuthor({
                                    name: suspiciousUser?.user.username,
                                    iconURL: suspiciousUser?.user.displayAvatarURL(),
                                })
                                .addFields(
                                    {
                                        name: "Banned by",
                                        value: `<@${client.user?.id}>`,
                                        inline: true,
                                    },
                                    {
                                        name: "Reason",
                                        value: `\`Suspicious user listed by developer. Please contact the developer if this is a mistake.\``,
                                        inline: true,
                                    }
                                )
                                .setFooter({
                                    iconURL: `${client.user?.displayAvatarURL()}`,
                                    text: `${client.user?.username} - Logging system`,
                                });

                            await loggingChannel?.send({ embeds: [lEmbed] });
                        } catch (err) {
                            continue;
                        }
                    }
                }
            } else {
                await ModerationModel.findOneAndUpdate(
                    { GuildID: interaction.guildId },
                    {
                        MultiGuilded: multiGuilded,
                        MuteRoleID: muteRole?.id,
                        LogChannelID: loggingChannel?.id,
                        BanSuspicious: banSuspicious,
                    }
                )

                rEmbed
                    .setColor(HexToColor(mConfig.embedColorSuccess))
                    .setDescription(
                        `\`✅\` Successfully updated the advanced moderation system.`
                    )
                    .addFields(
                        {
                            name: "Multi-guilded",
                            value: `\`${multiGuilded ? "Yes" : "No"}\``,
                            inline: true,
                        },
                        {
                            name: "Mute Role",
                            value: `${muteRole}`,
                            inline: true,
                        },
                        {
                            name: "Logging channel",
                            value: `${loggingChannel}`,
                            inline: true,
                        }
                    );

                interaction.reply({ embeds: [rEmbed], ephemeral: true });
            }
        }

        if (subcmd === "remove") {
            const removed = await ModerationModel.findOneAndDelete({ GuildID: interaction.guildId });

            if (removed) {
                rEmbed
                    .setColor(HexToColor(mConfig.embedColorSuccess))
                    .setDescription(`\`✅\` Successfully removed the advanced moderation system.`);
            } else {
                rEmbed
                    .setColor(HexToColor(mConfig.embedColorError))
                    .setDescription(
                        `\`❌\` This server isn't configured yet.\n\n\`💡\` Use \`/moderationsystem configure\` to start configuring this server`
                    );
            }
            interaction.reply({ embeds: [rEmbed], ephemeral: true });
        }
    },

    options: {
        userPermissions: ["Administrator"]
    }
} satisfies Command;