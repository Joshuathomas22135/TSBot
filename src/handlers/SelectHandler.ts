import fs from "fs";
import path from "path";
import { Collection } from "discord.js";
import { Select } from "../types";
import { logger } from "../utils/logger.js";
import { getScriptFiles } from "../utils/walk.js";

export class SelectHandler {
    private items = new Collection<string, Select>();
    private readonly handlerName = "SELECT HANDLER";

    async load(selectsPath: string, verbose: boolean = false): Promise<void> {
        this.items.clear();

        const fullPath = path.isAbsolute(selectsPath)
            ? selectsPath
            : path.join(process.cwd(), selectsPath);

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
                const selectModule = await import(fileUrl);
                const select: Select = selectModule.default;

                const relativePath = path.relative(process.cwd(), filePath);

                if (!select?.customId || !select?.run) {
                    logger.warn(this.handlerName, `Skipping invalid select menu file: ${relativePath}`);
                    continue;
                }

                if (select.options?.deleted) {
                    logger.info(this.handlerName, `Skipping deleted select menu: ${select.customId}`);
                    continue;
                }

                const customId = select.customId;
                if (this.items.has(customId)) {
                    logger.warn(this.handlerName, `Duplicate select customId: ${customId} (overwriting)`);
                }

                this.items.set(customId, select);

                if (verbose) {
                    logger.verbose(this.handlerName, `Loaded select menu: ${customId}`);
                }

            } catch (error) {
                logger.error(this.handlerName, `Failed to load select menu ${filePath}: ${error}`);
            }
        }

        if (this.items.size > 0 || !verbose) {
        //    logger.success(this.handlerName, `Loaded ${this.items.size} select menus from ${files.length} files`);
        }

        return Promise.resolve();
    }

    getItems(): Collection<string, Select> {
        return this.items;
    }
}