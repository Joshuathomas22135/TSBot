import { EmbedBuilder } from "discord.js";
import { Modal } from "@/types";

export default {
    customId: "addRoleMdl",
    run: async ({ client, interaction }) => {
        try {
            const { message, guild, fields } = interaction;

            const embedAuthor = message?.embeds[0]?.author;
            const guildMembers = await guild?.members.fetch({
                query: embedAuthor?.name,
                limit: 1,
            });
            const targetMember = guildMembers?.first();

            const roleId = fields.getTextInputValue("roleIdInput");
            const role = guild?.roles.cache.get(roleId);

            await interaction.deferReply({ ephemeral: true });

            const addedRoleEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `${targetMember?.user.username}`,
                    iconURL: `${targetMember?.user.displayAvatarURL()}`,
                })
                .setDescription(
                    `**${role} has been added successfully to ${targetMember}!**`
                );

            await targetMember?.roles.add(roleId).catch((error) => {
                console.error("Error adding role:", error);
            })

            return interaction.editReply({ embeds: [addedRoleEmbed], components: [] });
        } catch (error) {
            console.error("Error in addRoleMdl:", error);
        }
    },
    options: {
        userPermissions: ["ManageRoles"],
        botPermissions: ["ManageRoles"],
    }
} satisfies Modal;