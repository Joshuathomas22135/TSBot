import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { performance } from 'perf_hooks';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    gray: '\x1b[90m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(`${colors.cyan}${question}${colors.reset} `, resolve);
    });
}

// Configuration
const config = {
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    token: process.env.BOT_TOKEN
};

// Validate configuration
if (!config.clientId || !config.token) {
    log('\n❌ Missing required environment variables!', colors.red);
    log('\nPlease create a .env file with:', colors.yellow);
    log('CLIENT_ID=your_client_id_here', colors.cyan);
    log('BOT_TOKEN=your_bot_token_here', colors.cyan);
    log('GUILD_ID=your_guild_id_here (optional)', colors.cyan);
    process.exit(1);
}

// Initialize REST client
const rest = new REST({ version: '10' }).setToken(config.token);

/**
 * Display commands in a formatted table
 */
function displayCommands(commands, type) {
    if (commands.length === 0) {
        log(`   No ${type} commands found.`, colors.yellow);
        return;
    }
    
    log(`\n📋 ${type} Commands (${commands.length}):`, colors.cyan);
    log('┌────┬────────────────────┬──────────────────────────┐', colors.gray);
    log('│ #  │ Name               │ ID                       │', colors.gray);
    log('├────┼────────────────────┼──────────────────────────┤', colors.gray);
    
    commands.forEach((cmd, index) => {
        const num = (index + 1).toString().padEnd(2);
        const name = cmd.name.padEnd(18);
        const id = cmd.id ? cmd.id.substring(0, 24) + '...' : 'N/A'.padEnd(24);
        log(`│ ${num} │ ${name} │ ${id} │`, colors.gray);
    });
    
    log('└────┴────────────────────┴──────────────────────────┘', colors.gray);
}

/**
 * Delete all commands
 */
async function deleteAllCommands(globalCommands, guildCommands) {
    log('\n🗑️  Deleting all commands...', colors.yellow);
    
    try {
        // Delete global commands
        if (globalCommands.length > 0) {
            log('\n   Deleting global commands:', colors.cyan);
            for (const command of globalCommands) {
                if (!command.id) continue;
                await rest.delete(`${Routes.applicationCommands(config.clientId)}/${command.id}`);
                log(`   ✅ Deleted: ${command.name}`, colors.green);
            }
        }

        // Delete guild commands
        if (config.guildId && guildCommands.length > 0) {
            log('\n   Deleting guild commands:', colors.cyan);
            for (const command of guildCommands) {
                if (!command.id) continue;
                await rest.delete(
                    `${Routes.applicationGuildCommands(config.clientId, config.guildId)}/${command.id}`
                );
                log(`   ✅ Deleted: ${command.name}`, colors.green);
            }
        }

        log('\n✅ Successfully deleted all commands!', colors.green);
    } catch (error) {
        log(`\n❌ Error deleting commands: ${error.message}`, colors.red);
    }
}

/**
 * Delete global commands only
 */
async function deleteGlobalCommands(globalCommands) {
    log('\n🗑️  Deleting global commands...', colors.yellow);
    
    try {
        for (const command of globalCommands) {
            if (!command.id) continue;
            await rest.delete(`${Routes.applicationCommands(config.clientId)}/${command.id}`);
            log(`   ✅ Deleted: ${command.name}`, colors.green);
        }

        log('\n✅ Successfully deleted all global commands!', colors.green);
    } catch (error) {
        log(`\n❌ Error deleting global commands: ${error.message}`, colors.red);
    }
}

/**
 * Delete guild commands only
 */
async function deleteGuildCommands(guildCommands) {
    if (!config.guildId) {
        log('\n❌ No guild ID configured!', colors.red);
        return;
    }
    
    log('\n🗑️  Deleting guild commands...', colors.yellow);
    
    try {
        for (const command of guildCommands) {
            if (!command.id) continue;
            await rest.delete(
                `${Routes.applicationGuildCommands(config.clientId, config.guildId)}/${command.id}`
            );
            log(`   ✅ Deleted: ${command.name}`, colors.green);
        }

        log('\n✅ Successfully deleted all guild commands!', colors.green);
    } catch (error) {
        log(`\n❌ Error deleting guild commands: ${error.message}`, colors.red);
    }
}

/**
 * Delete specific command by index
 */
async function deleteSpecificCommand(globalCommands, guildCommands) {
    try {
        log('\n');
        const type = await askQuestion('📋 Command type (global/guild):');
        
        if (type !== 'global' && type !== 'guild') {
            log('❌ Invalid type. Must be "global" or "guild"', colors.red);
            return;
        }
        
        const commands = type === 'global' ? globalCommands : guildCommands;
        
        if (commands.length === 0) {
            log(`❌ No ${type} commands found.`, colors.red);
            return;
        }
        
        displayCommands(commands, type);
        
        const indexStr = await askQuestion(`\n🔢 Enter command number to delete (1-${commands.length}):`);
        const index = parseInt(indexStr) - 1;
        
        if (isNaN(index) || index < 0 || index >= commands.length) {
            log('❌ Invalid command number.', colors.red);
            return;
        }
        
        const command = commands[index];
        
        if (type === 'global') {
            await rest.delete(`${Routes.applicationCommands(config.clientId)}/${command.id}`);
        } else {
            await rest.delete(
                `${Routes.applicationGuildCommands(config.clientId, config.guildId)}/${command.id}`
            );
        }
        
        log(`\n✅ Deleted ${type} command: ${command.name}`, colors.green);
        
    } catch (error) {
        log(`\n❌ Error deleting command: ${error.message}`, colors.red);
    }
}

/**
 * Delete multiple commands by selection
 */
async function deleteMultipleCommands(globalCommands, guildCommands) {
    try {
        log('\n');
        const type = await askQuestion('📋 Command type (global/guild):');
        
        if (type !== 'global' && type !== 'guild') {
            log('❌ Invalid type. Must be "global" or "guild"', colors.red);
            return;
        }
        
        const commands = type === 'global' ? globalCommands : guildCommands;
        
        if (commands.length === 0) {
            log(`❌ No ${type} commands found.`, colors.red);
            return;
        }
        
        displayCommands(commands, type);
        
        const indicesStr = await askQuestion(`\n🔢 Enter command numbers to delete (comma-separated, e.g., 1,3,5):`);
        const indices = indicesStr.split(',').map(i => parseInt(i.trim()) - 1);
        
        const validIndices = indices.filter(i => !isNaN(i) && i >= 0 && i < commands.length);
        
        if (validIndices.length === 0) {
            log('❌ No valid command numbers provided.', colors.red);
            return;
        }
        
        log(`\n🗑️  Deleting ${validIndices.length} commands...`, colors.yellow);
        
        for (const index of validIndices) {
            const command = commands[index];
            
            if (type === 'global') {
                await rest.delete(`${Routes.applicationCommands(config.clientId)}/${command.id}`);
            } else {
                await rest.delete(
                    `${Routes.applicationGuildCommands(config.clientId, config.guildId)}/${command.id}`
                );
            }
            
            log(`   ✅ Deleted: ${command.name}`, colors.green);
        }
        
        log(`\n✅ Successfully deleted ${validIndices.length} ${type} commands!`, colors.green);
        
    } catch (error) {
        log(`\n❌ Error deleting commands: ${error.message}`, colors.red);
    }
}

/**
 * Main function
 */
async function main() {
    log('\n═══════════════════════════════════════════════', colors.magenta);
    log('         COMMAND DELETION SCRIPT', colors.cyan);
    log('═══════════════════════════════════════════════\n', colors.magenta);

    const startTime = performance.now();

    try {
        // Fetch global commands
        log('📡 Fetching global commands...', colors.yellow);
        const globalCommands = await rest.get(Routes.applicationCommands(config.clientId));
        
        // Fetch guild commands if guild ID is provided
        let guildCommands = [];
        if (config.guildId) {
            log('📡 Fetching guild commands...', colors.yellow);
            guildCommands = await rest.get(
                Routes.applicationGuildCommands(config.clientId, config.guildId)
            );
        }

        // Display commands
        displayCommands(globalCommands, 'Global');
        if (config.guildId) {
            displayCommands(guildCommands, 'Guild');
        }

        // Check if there are any commands
        if (globalCommands.length === 0 && guildCommands.length === 0) {
            log('\n✨ No commands to delete!', colors.green);
            return;
        }

        // Menu options
        log('\n📋 Available Actions:', colors.cyan);
        log('   1. Delete ALL commands (global + guild)', colors.reset);
        log('   2. Delete ONLY global commands', colors.reset);
        log('   3. Delete ONLY guild commands', colors.reset);
        log('   4. Delete specific command', colors.reset);
        log('   5. Delete multiple commands', colors.reset);
        log('   6. Exit', colors.reset);

        const choice = await askQuestion('\n🔧 Enter your choice (1-6):');

        switch (choice) {
            case '1':
                await deleteAllCommands(globalCommands, guildCommands);
                break;
            case '2':
                await deleteGlobalCommands(globalCommands);
                break;
            case '3':
                await deleteGuildCommands(guildCommands);
                break;
            case '4':
                await deleteSpecificCommand(globalCommands, guildCommands);
                break;
            case '5':
                await deleteMultipleCommands(globalCommands, guildCommands);
                break;
            case '6':
                log('\n👋 Exiting...', colors.yellow);
                break;
            default:
                log('\n❌ Invalid choice!', colors.red);
        }

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, colors.red);
    }

    const endTime = performance.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    log(`\n⏱️  Time taken: ${totalTime}s`, colors.gray);

    rl.close();
}

// Run the script
main().catch(error => {
    log(`\n❌ Fatal Error: ${error.message}`, colors.red);
    rl.close();
});