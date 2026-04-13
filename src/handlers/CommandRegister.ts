import { REST } from "@discordjs/rest";
import { Routes, APIApplicationCommand } from "discord-api-types/v10";
import { logger } from "../utils/logger.js";

interface RegisterOptions {
    rest: REST;
    clientId: string;
    guildIds: string[];
    commands: any[];
    verbose?: boolean;
}

export async function registerCommands({
    rest,
    clientId,
    guildIds,
    commands,
    verbose = false
}: RegisterOptions): Promise<void> {
    // Filter out any empty strings from guildIds
    const validGuildIds = guildIds.filter(id => id && id.trim() !== '');
    const isGlobal = validGuildIds.length === 0;
    const targetGuilds = isGlobal ? [null] : validGuildIds;

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;

    for (const guildId of targetGuilds) {
        const route = guildId
            ? Routes.applicationGuildCommands(clientId, guildId)
            : Routes.applicationCommands(clientId);

        try {
            if (verbose) {
                logger.info("REGISTRY", `Fetching commands for ${guildId ? `guild ${guildId}` : "global"}...`);
            }

            const existingCommands = (await rest.get(route)) as APIApplicationCommand[];
            const existingMap = new Map(existingCommands.map(c => [c.name, c]));

            const commandsToCreate: any[] = [];
            const commandsToUpdate: Map<string, any> = new Map();

            for (const cmd of commands) {
                const existing = existingMap.get(cmd.name);
                if (!existing) {
                    commandsToCreate.push(cmd);
                } else {
                    if (JSON.stringify(cmd) !== JSON.stringify(existing)) {
                        commandsToUpdate.set(existing.id, cmd);
                    }
                }
            }

            const localNames = new Set(commands.map(c => c.name));
            const commandsToDelete = existingCommands.filter(c => !localNames.has(c.name)).map(c => c.id);

            for (const id of commandsToDelete) {
                await rest.delete(`${route}/${id}`);
                totalDeleted++;
                if (verbose) {
                    logger.verbose("REGISTRY", `Deleted command ID ${id}`);
                }
            }

            for (const cmd of commandsToCreate) {
                await rest.post(route, { body: cmd });
                totalCreated++;
                if (verbose) {
                    logger.verbose("REGISTRY", `Created: ${cmd.name}`);
                }
            }

            for (const [id, cmd] of commandsToUpdate.entries()) {
                await rest.patch(`${route}/${id}`, { body: cmd });
                totalUpdated++;
                if (verbose) {
                    logger.verbose("REGISTRY", `Updated: ${cmd.name}`);
                }
            }

        } catch (error) {
            logger.error("REGISTRY", `Failed to sync commands: ${error}`);
        }
    }

    logger.line();
    logger.summary("REGISTRATION SUMMARY", {
        Created: totalCreated,
        Updated: totalUpdated,
        Deleted: totalDeleted,
        Total: commands.length
    });
}