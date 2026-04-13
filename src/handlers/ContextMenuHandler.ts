import fs from "fs";
import path from "path";
import { Collection } from "discord.js";
import { ContextMenu } from "../types";
import { logger } from "../utils/logger.js";
import { getScriptFiles } from "../utils/walk.js";

export class ContextMenuHandler {
    private items = new Collection<string, ContextMenu>();
    private readonly handlerName = "CONTEXT HANDLER";

    async load(contextPath: string, verbose: boolean = false): Promise<void> {
        this.items.clear();

        const fullPath = path.isAbsolute(contextPath)
            ? contextPath
            : path.join(process.cwd(), contextPath);

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
                const contextModule = await import(fileUrl);
                const context: ContextMenu = contextModule.default;

                const relativePath = path.relative(process.cwd(), filePath);

                if (!context?.data || !context?.data.name || !context?.run) {
                    logger.warn(this.handlerName, `Skipping invalid context menu file: ${relativePath}`);
                    continue;
                }

                if (context.options?.deleted) {
                    logger.info(this.handlerName, `Skipping deleted context menu: ${context.data.name}`);
                    continue;
                }

                const name = context.data.name;
                if (this.items.has(name)) {
                    logger.warn(this.handlerName, `Duplicate context menu name: ${name} (overwriting)`);
                }

                this.items.set(name, context);

                if (verbose) {
                    logger.verbose(this.handlerName, `Loaded context menu: ${name}`);
                }

            } catch (error) {
                logger.error(this.handlerName, `Failed to load context menu ${filePath}: ${error}`);
            }
        }

        if (this.items.size > 0 || !verbose) {
        //    logger.success(this.handlerName, `Loaded ${this.items.size} context menus from ${files.length} files`);
        }

        return Promise.resolve();
    }

    getItems(): Collection<string, ContextMenu> {
        return this.items;
    }
}