import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Button } from "@/types";

export default {
    customId: "addRoleBtn",

    run: async ({ client, interaction }) => {
        const targetId = interaction.customId.split('_')[1];

        const addRoleMdl = new ModalBuilder()
            .setCustomId(`addRoleMdl_${targetId}`)
            .setTitle("Add a Role");

        const RoleIdInput = new TextInputBuilder()
            .setCustomId("RoleIdInput")
            .setLabel("Role ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(RoleIdInput);

        addRoleMdl.addComponents(row);

        await interaction.showModal(addRoleMdl);
    },

    options: {
        userPermissions: ["ManageRoles"]
    }
} satisfies Button;