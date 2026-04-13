import { Button } from "@/types";

export default {
    customId: "cancelBtn",
    run: async ({ client, interaction }) => {
        await interaction.deferUpdate();
        await interaction.message.delete();
    }
} satisfies Button;