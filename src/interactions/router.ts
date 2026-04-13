import {
    Interaction,
    ChatInputCommandInteraction,
    MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction,
    ButtonInteraction,
    ModalSubmitInteraction,
    StringSelectMenuInteraction,
    AutocompleteInteraction,
    EmbedBuilder,
    MessageFlags
} from "discord.js";
import { HandlerManager } from "@/handlers/HandlerManager.js";
import { ExecutionContext } from "@/types/ExecutionContext.js";
import { logger } from "@/utils/logger.js";
import { runValidations } from "@/validations";
import { mConfig } from "@/config";
import { HexToColor } from "@/utils/color.js";

export async function interactionRouter(interaction: Interaction, manager: HandlerManager): Promise<void> {
    try {
        if (interaction.isAutocomplete()) {
            await handleAutocomplete(interaction, manager);
            return;
        }

        if (interaction.isChatInputCommand()) {
            await handleChatInputCommand(interaction, manager);
        } else if (interaction.isMessageContextMenuCommand()) {
            await handleMessageContextMenu(interaction, manager);
        } else if (interaction.isUserContextMenuCommand()) {
            await handleUserContextMenu(interaction, manager);
        } else if (interaction.isButton()) {
            await handleButton(interaction, manager);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction, manager);
        } else if (interaction.isStringSelectMenu()) {
            await handleStringSelectMenu(interaction, manager);
        }
    } catch (error) {
        await handleRouterError(interaction, error);
    }
}

async function handleChatInputCommand(
    interaction: ChatInputCommandInteraction,
    manager: HandlerManager
): Promise<void> {
    const cmd = manager.commandHandler.getItems().get(interaction.commandName);

    if (!cmd) {
        await interaction.reply({
            content: "Command not found.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const ctx: ExecutionContext<ChatInputCommandInteraction> = {
        client: manager.client,
        interaction,
        args: {},
        handler: manager
    };

    const passed = await runValidations(ctx, cmd.options);
    if (!passed) return;

    await cmd.run(ctx);
}

async function handleMessageContextMenu(
    interaction: MessageContextMenuCommandInteraction,
    manager: HandlerManager
): Promise<void> {
    const ctxMenu = manager.contextHandler.getItems().get(interaction.commandName);

    if (!ctxMenu) {
        await interaction.reply({
            content: "Context menu not found.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const ctx: ExecutionContext<MessageContextMenuCommandInteraction> = {
        client: manager.client,
        interaction,
        args: {},
        handler: manager
    };

    const passed = await runValidations(ctx, ctxMenu.options);
    if (!passed) return;

    await ctxMenu.run(ctx);
}

async function handleUserContextMenu(
    interaction: UserContextMenuCommandInteraction,
    manager: HandlerManager
): Promise<void> {
    const ctxMenu = manager.contextHandler.getItems().get(interaction.commandName);

    if (!ctxMenu) {
        await interaction.reply({
            content: "Context menu not found.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const ctx: ExecutionContext<UserContextMenuCommandInteraction> = {
        client: manager.client,
        interaction,
        args: {},
        handler: manager
    };

    const passed = await runValidations(ctx, ctxMenu.options);
    if (!passed) return;

    await ctxMenu.run(ctx);
}

async function handleButton(
    interaction: ButtonInteraction,
    manager: HandlerManager
): Promise<void> {

    const ignoredButtons = ["prev", "home", "next", "renew-yes", "renew-no"];

    if (ignoredButtons.includes(interaction.customId)) {
        return;
    }

    const baseCustomId = interaction.customId.split('_')[0];
    const btn = manager.buttonHandler.getItems().get(baseCustomId);

    if (!btn) {
        await interaction.reply({
            content: "Button not found.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const ctx: ExecutionContext<ButtonInteraction> = {
        client: manager.client,
        interaction,
        args: {
            targetId: interaction.customId.split('_')[1]
        },
        handler: manager
    };

    const passed = await runValidations(ctx, btn.options);
    if (!passed) return;

    await btn.run(ctx);
}

async function handleModalSubmit(
    interaction: ModalSubmitInteraction,
    manager: HandlerManager
): Promise<void> {
    const baseCustomId = interaction.customId.split('_')[0];
    const modal = manager.modalHandler.getItems().get(baseCustomId);

    const ignoredModals = ["modmailUserMdl"];

    if (ignoredModals.includes(interaction.customId)) {
        return;
    }

    if (!modal) {
        await interaction.reply({
            content: "Modal not found.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const ctx: ExecutionContext<ModalSubmitInteraction> = {
        client: manager.client,
        interaction,
        args: {
            targetId: interaction.customId.split('_')[1]
        },
        handler: manager
    };

    const passed = await runValidations(ctx, modal.options);
    if (!passed) return;

    await modal.run(ctx);
}

async function handleStringSelectMenu(
    interaction: StringSelectMenuInteraction,
    manager: HandlerManager
): Promise<void> {
    const baseCustomId = interaction.customId.split('_')[0];
    const select = manager.selectHandler.getItems().get(baseCustomId);

    if (!select) {
        await interaction.reply({
            content: "Select menu not found.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const ctx: ExecutionContext<StringSelectMenuInteraction> = {
        client: manager.client,
        interaction,
        args: {
            targetId: interaction.customId.split('_')[1],
            values: interaction.values
        },
        handler: manager
    };

    const passed = await runValidations(ctx, select.options);
    if (!passed) return;

    await select.run(ctx);
}

async function handleAutocomplete(
    interaction: AutocompleteInteraction,
    manager: HandlerManager
): Promise<void> {
    const cmd = manager.commandHandler.getItems().get(interaction.commandName);

    if (cmd?.autocomplete) {
        try {
            await cmd.autocomplete(interaction);
        } catch (error) {
            logger.error("ROUTER", `Error in autocomplete: ${error}`);
        }
    }
}

async function handleRouterError(interaction: Interaction, error: any): Promise<void> {
    logger.error("ROUTER", `Error handling interaction: ${error}`);

    if ('reply' in interaction && typeof interaction.reply === 'function') {
        try {
            if (!interaction.replied && !interaction.deferred) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(HexToColor(mConfig.embedColorError))
                    .setDescription("An internal error occurred.");

                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({
                    content: "An internal error occurred."
                });
            }
        } catch (replyError) {
            logger.error("ROUTER", `Failed to send error reply: ${replyError}`);
        }
    }
}