import fs from "fs";
import path from "path";
import { Collection } from "discord.js";
import { Button } from "../types";
import { logger } from "../utils/logger.js";
import { getScriptFiles } from "../utils/walk.js";

export class ButtonHandler {
    private items = new Collection<string, Button>();
    private readonly handlerName = "BUTTON HANDLER";

    async load(buttonsPath: string, verbose: boolean = false): Promise<void> {
        this.items.clear();

        const fullPath = path.isAbsolute(buttonsPath)
            ? buttonsPath
            : path.join(process.cwd(), buttonsPath);

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
                const buttonModule = await import(fileUrl);
                const button: Button = buttonModule.default;

                const relativePath = path.relative(process.cwd(), filePath);

                if (!button?.customId || !button?.run) {
                    logger.warn(this.handlerName, `Skipping invalid button file: ${relativePath}`);
                    continue;
                }

                if (button.options?.deleted) {
                    logger.info(this.handlerName, `Skipping deleted button: ${button.customId}`);
                    continue;
                }

                const customId = button.customId;
                if (this.items.has(customId)) {
                    logger.warn(this.handlerName, `Duplicate button customId: ${customId} (overwriting)`);
                }

                this.items.set(customId, button);

                if (verbose) {
                    logger.verbose(this.handlerName, `Loaded button: ${customId}`);
                }

            } catch (error) {
                logger.error(this.handlerName, `Failed to load button ${filePath}: ${error}`);
            }
        }

        if (this.items.size > 0 || !verbose) {
        //    logger.success(this.handlerName, `Loaded ${this.items.size} buttons from ${files.length} files`);
        }

        return Promise.resolve();
    }

    getItems(): Collection<string, Button> {
        return this.items;
    }
}