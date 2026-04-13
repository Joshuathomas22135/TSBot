import { Client, GatewayIntentBits } from "discord.js";
import { HandlerManager } from "./handlers/HandlerManager.js";
import { logger } from "./utils/logger.js";
import * as dotenv from "dotenv";
import { connectMongoDB } from "@/database";

dotenv.config();

async function main() {
    logger.clear();

    logger.section("BOT STARTUP");

    const verbose = false;
    logger.info("SYSTEM", `Verbose mode: ${verbose ? 'ON' : 'OFF'}`);

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    const handler = new HandlerManager({
        client,
        commandsPath: "./src/commands",
        eventsPath: "./src/events",
        buttonsPath: "./src/buttons",
        modalsPath: "./src/modals",
        selectsPath: "./src/selects",
        contextMenusPath: "./src/contextMenus",
        validationsPath: "./src/validations",
        devGuildIds: process.env.DEV_GUILD_IDS?.split(',') || [],
        devUserIds: process.env.DEV_USER_IDS?.split(',') || [],
        devRoleIds: process.env.DEV_ROLE_IDS?.split(',') || [],
        verbose
    });

    if (process.env.MONGODB_URI) {
        await connectMongoDB(process.env.MONGODB_URI);
    }

    await handler.loadAll();
    await client.login(process.env.BOT_TOKEN);
}

main().catch(err => {
    logger.error("SYSTEM", `Fatal error: ${err}`);
    process.exit(1);
});