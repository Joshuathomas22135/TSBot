import fs from "fs";
import path from "path";
import { Collection } from "discord.js";
import { Modal } from "../types";
import { logger } from "../utils/logger.js";
import { getScriptFiles } from "../utils/walk.js";

export class ModalHandler {
    private items = new Collection<string, Modal>();
    private readonly handlerName = "MODAL HANDLER";

    async load(modalsPath: string, verbose: boolean = false): Promise<void> {
        this.items.clear();

        const fullPath = path.isAbsolute(modalsPath)
            ? modalsPath
            : path.join(process.cwd(), modalsPath);

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
                const modalModule = await import(fileUrl);
                const modal: Modal = modalModule.default;

                const relativePath = path.relative(process.cwd(), filePath);

                if (!modal?.customId || !modal?.run) {
                    logger.warn(this.handlerName, `Skipping invalid modal file: ${relativePath}`);
                    continue;
                }

                if (modal.options?.deleted) {
                    logger.info(this.handlerName, `Skipping deleted modal: ${modal.customId}`);
                    continue;
                }

                const customId = modal.customId;
                if (this.items.has(customId)) {
                    logger.warn(this.handlerName, `Duplicate modal customId: ${customId} (overwriting)`);
                }

                this.items.set(customId, modal);

                if (verbose) {
                    logger.verbose(this.handlerName, `Loaded modal: ${customId}`);
                }

            } catch (error) {
                logger.error(this.handlerName, `Failed to load modal ${filePath}: ${error}`);
            }
        }

        if (this.items.size > 0 || !verbose) {
        //    logger.success(this.handlerName, `Loaded ${this.items.size} modals from ${files.length} files`);
        }

        return Promise.resolve();
    }

    getItems(): Collection<string, Modal> {
        return this.items;
    }
}