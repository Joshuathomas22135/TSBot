import fs from "fs";
import path from "path";
import { Client, Collection } from "discord.js";
import { Event } from "../types/Event.js";
import { logger } from "../utils/logger.js";
import { getScriptFiles } from "../utils/walk.js";
import { HandlerManager } from "./HandlerManager.js";

export class EventHandler {
    // Store arrays of event files per event name (folder name)
    private items = new Collection<string, Event[]>();
    private readonly handlerName = "EVENT HANDLER";

    async load(eventsPath: string, client: Client, manager: HandlerManager, verbose: boolean = false): Promise<void> {
        this.items.clear();

        const fullPath = path.isAbsolute(eventsPath)
            ? eventsPath
            : path.join(process.cwd(), eventsPath);

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
                // The event name is the parent folder name (e.g., "ready", "messageCreate")
                const eventName = path.basename(path.dirname(filePath));

                const fileUrl = new URL(`file://${filePath}`).href;
                const eventModule = await import(fileUrl);
                const event: Event = eventModule.default;

                const relativePath = path.relative(process.cwd(), filePath);

                if (!event?.execute) {
                    logger.warn(this.handlerName, `Skipping invalid event file (missing execute): ${relativePath}`);
                    continue;
                }

                // Store the event file in the collection keyed by folder name
                if (!this.items.has(eventName)) {
                    this.items.set(eventName, []);
                }
                this.items.get(eventName)!.push(event);

                // Register the listener
                const listener = async (...args: unknown[]) => {
                    try {
                        // For ready event, pass manager as second argument
                        if (eventName === "ready") {
                            await (event.execute as any)(args[0], manager);
                        } else {
                            await (event.execute as any)(...args);
                        }
                    } catch (error) {
                        logger.error(this.handlerName, `Error in ${eventName} event: ${error}`);
                    }
                };

                if (event.once) {
                    client.once(eventName as any, listener);
                    if (verbose) {
                        logger.verbose(this.handlerName, `Registered once event: ${eventName} from ${path.basename(filePath)}`);
                    }
                } else {
                    client.on(eventName as any, listener);
                    if (verbose) {
                        logger.verbose(this.handlerName, `Registered on event: ${eventName} from ${path.basename(filePath)}`);
                    }
                }

            } catch (error) {
                logger.error(this.handlerName, `Failed to load event ${filePath}: ${error}`);
            }
        }

        // Log summary
        const totalHandlers = Array.from(this.items.values()).reduce((sum, arr) => sum + arr.length, 0);
        if (totalHandlers > 0 || !verbose) {
            logger.success(this.handlerName, `Loaded ${totalHandlers} event handlers for ${this.items.size} events`);
        }

        return Promise.resolve();
    }

    getItems(): Collection<string, Event[]> {
        return this.items;
    }
}