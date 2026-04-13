import { Button } from "@/types";
import {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";

export default {
    customId: "tempMuteBtn",
    run: async ({ client, interaction }) => {
        try {
            const tempMuteMdl = new ModalBuilder()
                .setCustomId("tempMuteMdl")
                .setTitle("Temp Mute");
            
            const tempMuteTimeInput =  new TextInputBuilder()
              .setLabel("Time")
              .setCustomId("tempMuteTime")
              .setPlaceholder("h for hour, d for day, m month, y for year")
              .setStyle(TextInputStyle.Short);
              
            const tempMuteReasonInput = new TextInputBuilder()
              .setLabel("Reason")
              .setCustomId("tempMuteReason")
              .setPlaceholder("Reasoning to tempmute this user")
              .setStyle(TextInputStyle.Paragraph);

            
              tempMuteMdl.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(tempMuteTimeInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(tempMuteReasonInput)
              );
            
            return await interaction.showModal(tempMuteMdl)
        } catch (error) {
            console.error("Error in tempMuteBtn:", error);
        }
    },
    options: {
        userPermissions: ["BanMembers"],
        botPermissions: ["BanMembers"],
    }
} satisfies Button;