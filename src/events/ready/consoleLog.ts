import { Client, Events } from "discord.js";
import { Event } from "@/types";
import { HandlerManager } from "@/handlers/HandlerManager.js";
import { logger } from "@/utils/logger.js";

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client, manager: HandlerManager) {
        logger.success("BOT", `Logged in as ${client.user?.tag}!`)

        if (!manager) {
            logger.error("BOT", "Manager is undefined in ready event!");
            return;
        }

        await manager.setReady(true);
        await manager.registerAll();

        logger.success("BOT", "All handlers registered!");
    }
} satisfies Event<Events.ClientReady>