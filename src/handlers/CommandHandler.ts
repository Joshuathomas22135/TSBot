import fs from "fs";
import path from "path";
import { Collection } from "discord.js";
import { Command } from "../types";
import { logger } from "../utils/logger.js";
import { getScriptFiles } from "../utils/walk.js";

export class CommandHandler {
    private items = new Collection<string, Command>();
    private readonly handlerName = "COMMAND HANDLER";

    async load(commandsPath: string, verbose: boolean = false): Promise<void> {
        this.items.clear();

        const fullPath = path.isAbsolute(commandsPath)
            ? commandsPath
            : path.join(process.cwd(), commandsPath);

        if (!fs.existsSync(fullPath)) {
            logger.warn(this.handlerName, `Path not found: ${fullPath}`);
            return Promise.resolve();
        }

        const files = getScriptFiles(fullPath);

        if (verbose) {
            logger.verbose(this.handlerName, `Found ${files.length} files recursively`);
        }

        for (const filePath of files) {
            try {
                const fileUrl = new URL(`file://${filePath}`).href;
                const commandModule = await import(fileUrl);
                const command: Command = commandModule.default;

                const relativePath = path.relative(process.cwd(), filePath);

                if (!command?.data || !command?.run) {
                    logger.warn(this.handlerName, `Skipping invalid command file: ${relativePath}`);
                    continue;
                }

                if (command.options?.deleted) {
                    logger.info(this.handlerName, `Skipping deleted command: ${command.data.name}`);
                    continue;
                }

                const commandName = command.data.name;
                if (this.items.has(commandName)) {
                    logger.warn(this.handlerName, `Duplicate command name: ${commandName} (overwriting)`);
                }

                this.items.set(commandName, command);

                if (verbose) {
                    logger.verbose(this.handlerName, `Loaded command: ${commandName}`);
                }

            } catch (error) {
                logger.error(this.handlerName, `Failed to load command ${filePath}: ${error}`);
            }
        }

        if (this.items.size > 0 || !verbose) {
        //    logger.success(this.handlerName, `Loaded ${this.items.size} commands from ${files.length} files`);
        }

        return Promise.resolve();
    }

    getItems(): Collection<string, Command> {
        return this.items;
    }
}