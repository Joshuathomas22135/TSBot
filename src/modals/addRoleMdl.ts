import { EmbedBuilder } from "discord.js";
import { Modal } from "@/types";

export default {
    customId: "addRoleMdl",
    run: async ({ client, interaction }) => {
        try {
            const { message, guild, fields } = interaction;

            const targetId = interaction.customId.split('_')[1];
            const targetMember = await guild?.members.fetch(targetId);

            if (!targetMember) {
                await interaction.reply({ content: "Target member not found.", flags: 64 });
                return;
            }

            const roleId = fields.getTextInputValue("RoleIdInput");
            const role = guild?.roles.cache.get(roleId);

            if (!role) {
                await interaction.reply({ content: "Invalid role ID.", flags: 64 });
                return;
            }

            if (!targetMember) {
                await interaction.reply({ content: "Target member not found.", flags: 64 });
                return;
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                await targetMember.roles.add(roleId);
                const addedRoleEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: `${targetMember.user.username}`,
                        iconURL: `${targetMember.user.displayAvatarURL()}`,
                    })
                    .setDescription(
                        `**${role} has been added successfully to ${targetMember}!**`
                    );
                return interaction.editReply({ embeds: [addedRoleEmbed], components: [] });
            } catch (error) {
                console.error("Error adding role:", error);
                await interaction.editReply({ content: `Failed to add role: ${(error as Error).message}`, embeds: [] });
            }
        } catch (error) {
            console.error("Error in addRoleMdl:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "An error occurred while adding the role.", flags: 64 });
            } else {
                await interaction.followUp({ content: "An error occurred while adding the role.", flags: 64 });
            }
        }
    },
    options: {
        userPermissions: ["ManageRoles"],
        botPermissions: ["ManageRoles"],
    }
} satisfies Modal;