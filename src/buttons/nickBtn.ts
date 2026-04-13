import { EmbedBuilder } from "discord.js";
import { ModerationModel } from "@/database/index.js";
import { mConfig } from "@/config/index.js";
import { Button } from "@/types/index.js";
import { HexToColor } from "@/utils/color.js";
import { isReplyableInteraction, isMessageCollectableChannel } from "@/utils/interactionUtils.js";

export default {
    customId: "nickBtn",
    async run({ client, interaction }) {
        const { message, channel, guildId, guild, user } = interaction;

        if (!guild || !guildId || !channel || !message) {
            if (isReplyableInteraction(interaction)) {
                await interaction.reply({ content: "Missing guild or channel.", flags: 64 });
            }
            return;
        }

        if (!isMessageCollectableChannel(channel)) {
            await interaction.reply({ content: "This button cannot be used here.", flags: 64 });
            return;
        }

        await interaction.deferUpdate();

        const embedAuthor = message.embeds[0]?.author;
        if (!embedAuthor?.name) {
            await interaction.editReply({ content: "Could not identify target user." });
            return;
        }

        const fetchedMembers = await guild.members.fetch({
            query: embedAuthor.name,
            limit: 1,
        });
        const targetMember = fetchedMembers.first();
        if (!targetMember) {
            await interaction.editReply({ content: "Target member not found." });
            return;
        }

        const tagline = Math.floor(Math.random() * 1000) + 1;

        const rEmbed = new EmbedBuilder()
            .setColor("White")
            .setFooter({ text: `${client.user?.username} - Moderate user` })
            .setAuthor({
                name: targetMember.user.username,
                iconURL: targetMember.user.displayAvatarURL({ extension: 'png', size: 1024 }),
            })
            .setDescription(
                `\`❔\` What is the reason to moderate the nickname of ${targetMember.user.username}?\n` +
                `\`❕\` You have 15 seconds to reply. After this time the moderation action will be automatically cancelled.\n` +
                `\`💡\` To continue without a reason, answer with \`-\`\n` +
                `\`💡\` To cancel the moderation action, answer with \`cancel\``
            );

        await interaction.editReply({ embeds: [rEmbed], components: [] });

        // Collect reason
        const filter = (m: any) => m.author.id === user.id;
        let reason: string | null = null;

        try {
            const collected = await channel.awaitMessages({ filter, max: 1, time: 15_000, errors: ["time"] });
            const reasonMessage = collected.first();
            if (!reasonMessage) return;

            const content = reasonMessage.content.toLowerCase();
            if (content === "cancel") {
                reasonMessage.delete().catch(() => null);
                rEmbed
                    .setColor(HexToColor(mConfig.embedColorError))
                    .setDescription("`❌` Moderation action cancelled.");
                await interaction.editReply({ embeds: [rEmbed] });
                setTimeout(() => interaction.deleteReply().catch(() => null), 2000);
                return;
            }

            reason = reasonMessage.content;
            if (reason === "-") reason = "No reason specified";
            reasonMessage.delete().catch(() => null);
        } catch {
            rEmbed
                .setColor(HexToColor(mConfig.embedColorError))
                .setDescription("`❌` Moderation action expired.");
            await interaction.editReply({ embeds: [rEmbed] });
            setTimeout(() => interaction.deleteReply().catch(() => null), 2000);
            return;
        }

        if (!reason) return;

        // Fetch server configuration
        const dataGD = await ModerationModel.findOne({ GuildID: guildId });
        if (!dataGD) {
            await interaction.editReply({ content: "Server not configured for moderation." });
            return;
        }

        try {
            await targetMember.setNickname(`Moderated Nickname ${tagline}`);
        } catch (error) {
            await interaction.editReply({ content: `Failed to change nickname: ${(error as Error).message}`, embeds: [] });
            return;
        }

        const { LogChannelID } = dataGD;
        const loggingChannel = guild.channels.cache.get(LogChannelID!) as any;
        if (loggingChannel && 'send' in loggingChannel) {
            const lEmbed = new EmbedBuilder()
                .setColor("White")
                .setTitle("`⛔` Moderated Nickname")
                .setAuthor({
                    name: targetMember.user.username,
                    iconURL: targetMember.user.displayAvatarURL({ extension: 'png', size: 1024 }),
                })
                .setDescription(
                    `\`💡\` Moderated nickname to \`Moderated Nickname ${tagline}\``
                )
                .addFields(
                    { name: "Changed by", value: `<@${user.id}>`, inline: true },
                    { name: "Reason", value: reason, inline: true }
                )
                .setFooter({
                    iconURL: client.user?.displayAvatarURL({ extension: 'png', size: 1024 }),
                    text: `${client.user?.username} - Logging system`,
                });

            loggingChannel.send({ embeds: [lEmbed] }).catch(() => null);
        }

        rEmbed
            .setColor(HexToColor(mConfig.embedColorSuccess))
            .setDescription(`\`✅\` Successfully moderated nickname of ${targetMember.user.username}.`);

        await interaction.editReply({ embeds: [rEmbed] });
        setTimeout(() => interaction.deleteReply().catch(() => null), 2000);
    },
    options: {
        userPermissions: ["ManageNicknames"],
        botPermissions: ["ManageNicknames"],
    },
} satisfies Button;