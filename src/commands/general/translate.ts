import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';
import stringifyLanguage, { LANGUAGE_CHOICES, LANGUAGE_TO_COUNTRY } from '@/utils/stringifyLanguage';
import translate from '@iamtraction/google-translate';
import { Command } from '@/types';

export default {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate some text into a different language.')
        .addStringOption(option =>
            option
                .setName('message-id')
                .setDescription('The message ID of the message you want to translate.')
        )
        .addStringOption(option =>
            option.setName('message').setDescription('The message you want to translate.')
        )
        .addStringOption(option =>
            option
                .setName('language')
                .setDescription('The language you want to translate the message to.')
                .addChoices(...LANGUAGE_CHOICES)
        ),

    run: async ({ interaction, client }) => {
        await interaction.deferReply({ ephemeral: true });

        const rEmbed = new EmbedBuilder().setColor('White').setFooter({
            text: `${client.user?.username} - Translate System`,
            iconURL: client.user?.displayAvatarURL(),
        });

        const messageID = interaction.options.getString('message-id');
        let message = '';

        if (messageID) {
            // Fetch channel to ensure it's text-based before attempting message fetch
            const channel = interaction.channel;
            if (channel && 'messages' in channel) {
                const fetched = await channel.messages.fetch(messageID).catch(() => null);
                message = fetched?.content || '';
            }
        }

        if (!message) {
            message = interaction.options.getString('message') || '';
        }

        if (!message || message.trim() === '') {
            await interaction.editReply({
                embeds: [rEmbed.setDescription('You need to provide a message to translate.')],
            });
            return;
        }

        const language = interaction.options.getString('language') || 'en';
        const languageName = stringifyLanguage(language);

        try {
            const res = await translate(message, { to: language });
            const originalLanguage = stringifyLanguage(res.from.language.iso);
            const translatedLanguage = languageName;

            const truncateField = (text: string): string => {
                if (text.length > 1024) {
                    return text.substring(0, 1021) + '...';
                }
                return text;
            };

            const truncatedMessage = truncateField(message);
            const truncatedTranslation = truncateField(res.text);

            const countryCode = LANGUAGE_TO_COUNTRY[language] || 'un';
            const flagUrl = `https://flagcdn.com/h240/${countryCode}.png`;

            rEmbed
                .addFields(
                    { name: 'Original Message', value: truncatedMessage },
                    { name: 'Translated Message', value: truncatedTranslation },
                    { name: 'Original Language', value: originalLanguage, inline: true },
                    { name: 'Translated Language', value: translatedLanguage, inline: true }
                )
                .setTimestamp()
                .setThumbnail(flagUrl);

            await interaction.editReply({ embeds: [rEmbed] });
        } catch (error) {
            console.error('Translation error:', error);
            await interaction.editReply({ content: 'An error occurred during translation.' });
        }
    }
} satisfies Command;