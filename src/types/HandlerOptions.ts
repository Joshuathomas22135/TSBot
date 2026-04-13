import { Client } from "discord.js";

export interface HandlerOptions {
    client: Client;
    commandsPath?: string;
    eventsPath?: string;
    buttonsPath?: string;
    modalsPath?: string;
    selectsPath?: string;
    contextMenusPath?: string;
    validationsPath?: string;
    devGuildIds?: string[];
    devUserIds?: string[];
    devRoleIds?: string[];
    verbose?: boolean
}
