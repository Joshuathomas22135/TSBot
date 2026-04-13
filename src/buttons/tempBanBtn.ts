import { Button } from "@/types";
import {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";

export default {
    customId: "tempBanBtn",
    run: async ({ client, interaction }) => {
        try {
            const tempBanMdl = new ModalBuilder()
                .setCustomId("tempBanMdl")
                .setTitle("Temp Ban");
            
            const tempBanTimeInput =  new TextInputBuilder()
              .setLabel("Time")
              .setCustomId("tempbanTime")
              .setPlaceholder("h for hour, d for day, m month, y for year")
              .setStyle(TextInputStyle.Short);
              
            const tempBanReasonInput = new TextInputBuilder()
              .setLabel("Reason")
              .setCustomId("tempbanReason")
              .setPlaceholder("Reasoning to tempban this user")
              .setStyle(TextInputStyle.Paragraph);

            
              tempBanMdl.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(tempBanTimeInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(tempBanReasonInput)
              );
            
            return await interaction.showModal(tempBanMdl)
        } catch (error) {
            console.error("Error in tempBanBtn:", error);
        }
    },
    options: {
        userPermissions: ["BanMembers"],
        botPermissions: ["BanMembers"],
    }
} satisfies Button;