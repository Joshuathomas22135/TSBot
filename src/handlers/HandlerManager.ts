import { Client } from "discord.js";
import { HandlerOptions } from "@/types/HandlerOptions.js";
import { CommandHandler } from "./CommandHandler.js";
import { EventHandler } from "./EventHandler.js";
import { ButtonHandler } from "./ButtonHandler.js";
import { ModalHandler } from "./ModalHandler.js";
import { SelectHandler } from "./SelectHandler.js";
import { ContextMenuHandler } from "./ContextMenuHandler.js";
import { logger, setVerbose } from "@/utils/logger.js";
import { createRest } from "@/utils/rest.js";
import { registerCommands } from "./CommandRegister.js";
import { interactionRouter } from "@/interactions/router.js";
import { loadValidations } from "@/validations"

export class HandlerManager {
    public client: Client;
    public commandHandler: CommandHandler;
    public eventHandler: EventHandler;
    public buttonHandler: ButtonHandler;
    public modalHandler: ModalHandler;
    public selectHandler: SelectHandler;
    public contextHandler: ContextMenuHandler;

    private options: HandlerOptions;
    private isReady: boolean = false;

    constructor(options: HandlerOptions) {
        this.options = options;
        this.client = options.client;

        if (options.verbose !== undefined) {
            setVerbose(options.verbose);
        }

        this.commandHandler = new CommandHandler();
        this.eventHandler = new EventHandler();
        this.buttonHandler = new ButtonHandler();
        this.modalHandler = new ModalHandler();
        this.selectHandler = new SelectHandler();
        this.contextHandler = new ContextMenuHandler();

        this.setupInteractionHandler();
    }

    private setupInteractionHandler(): void {
        this.client.on("interactionCreate", (interaction) => {
            interactionRouter(interaction, this);
        });
    }

    async loadAll(): Promise<void> {
        if (this.options.verbose) {
            logger.section("LOADING HANDLERS");
        }

        const startTime = Date.now();
        const stats: Record<string, number> = {};

        const {
            commandsPath = "./src/commands",
            eventsPath = "./src/events",
            buttonsPath = "./src/buttons",
            modalsPath = "./src/modals",
            selectsPath = "./src/selects",
            contextMenusPath = "./src/context",
            validationsPath = "./src/validations",
        } = this.options;

        const verbose = this.options.verbose || false;

        try {
            // Load validations first - now loadValidations exists!
            if (validationsPath) {
                await loadValidations(validationsPath);
            }

            await this.commandHandler.load(commandsPath, verbose);
            stats.Commands = this.commandHandler.getItems().size;

            await this.eventHandler.load(eventsPath, this.client, this, verbose);
            stats.Events = this.eventHandler.getItems().size;

            await this.buttonHandler.load(buttonsPath, verbose);
            stats.Buttons = this.buttonHandler.getItems().size;

            await this.modalHandler.load(modalsPath, verbose);
            stats.Modals = this.modalHandler.getItems().size;

            await this.selectHandler.load(selectsPath, verbose);
            stats.Selects = this.selectHandler.getItems().size;

            await this.contextHandler.load(contextMenusPath, verbose);
            stats.Context = this.contextHandler.getItems().size;

            const endTime = Date.now();
            const loadTime = ((endTime - startTime) / 1000).toFixed(2);

            logger.line();
            logger.summary("LOAD SUMMARY", stats);
            logger.success("HANDLER", `Loaded all handlers in ${loadTime}s`);

        } catch (error) {
            logger.error("HANDLER", `Failed to load handlers: ${error}`);
            throw error;
        }
    }

    async registerAll(): Promise<void> {
        if (!this.client.isReady()) {
            logger.warn("HANDLER", "Attempted to register commands before client ready");
            return;
        }

        if (this.options.verbose) {
            logger.section("COMMAND REGISTRATION");
        }

        const rest = createRest(this.client.token!);
        const devGuildIds = this.options.devGuildIds || [];
        const verbose = this.options.verbose || false;

        const commandCount = this.commandHandler.getItems().size;
        const contextCount = this.contextHandler.getItems().size;

        if (verbose) {
            logger.info("REGISTRY", `Preparing ${commandCount} commands and ${contextCount} context menus`);
        }

        const commandJson = this.commandHandler.getItems().map(c => {
            try {
                return c.data.toJSON();
            } catch (error) {
                logger.error("REGISTRY", `Failed to convert command ${c.data.name} to JSON: ${error}`);
                return null;
            }
        }).filter(c => c !== null);

        const contextJson = this.contextHandler.getItems().map(c => {
            try {
                if (c.data && typeof c.data.toJSON === 'function') {
                    return c.data.toJSON();
                } else {
                    logger.warn("REGISTRY", `Context menu ${c.data.name} using legacy format`);
                    return {
                        name: c.data.name,
                        type: 2
                    };
                }
            } catch (error) {
                logger.error("REGISTRY", `Failed to convert context menu ${c.data.name} to JSON: ${error}`);
                return null;
            }
        }).filter(c => c !== null);

        const commandsToRegister = [...commandJson, ...contextJson];

        if (commandsToRegister.length === 0) {
            logger.warn("REGISTRY", "No commands to register");
            return;
        }

        await registerCommands({
            rest,
            clientId: this.client.user!.id,
            guildIds: devGuildIds,
            commands: commandsToRegister,
            verbose
        });

        if (verbose) {
            logger.success("REGISTRY", "Command registration complete");
        }
    }

    getOptions(): HandlerOptions {
        return this.options;
    }

    isClientReady(): boolean {
        return this.isReady;
    }

    setReady(ready: boolean): void {
        this.isReady = ready;
    }
}