import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ExecutionContext, Options } from "@/types";
import { logger } from "../utils/logger.js";
import { getScriptFiles } from "../utils/walk.js";

// Import validation modules
import { devOnly } from "./devOnly.js";
import { userPermissions } from "./userPermissions.js";
import { botPermissions } from "./botPermissions.js";
import { guildOnly } from "./guildOnly.js";

export const validations: Record<string, { name: string; execute: (ctx: ExecutionContext) => Promise<boolean> }> = {
    devOnly,
    userPermissions,
    botPermissions,
    guildOnly
};

/**
 * Load all validation files dynamically
 */
export async function loadValidations(validationsPath: string): Promise<void> {
    try {
        const fullPath = path.isAbsolute(validationsPath)
            ? validationsPath
            : path.join(process.cwd(), validationsPath);

        if (!fs.existsSync(fullPath)) {
            logger.warn("VALIDATIONS", `Path not found: ${fullPath}`);
            return;
        }

        const files = getScriptFiles(fullPath);
        let loadedCount = 0;

        for (const filePath of files) {
            // Skip index.ts itself
            if (filePath.endsWith('index.ts') || filePath.endsWith('index.js')) {
                continue;
            }

            try {
                const fileUrl = new URL(`file://${filePath}`).href;
                await import(fileUrl);
                loadedCount++;
                logger.verbose("VALIDATIONS", `Loaded validation: ${path.basename(filePath)}`);
            } catch (error) {
                logger.error("VALIDATIONS", `Failed to load ${path.basename(filePath)}: ${error}`);
            }
        }

        if (loadedCount > 0) {
        //    logger.success("VALIDATIONS", `Loaded ${loadedCount} validation files`);
        }
    } catch (error) {
        logger.error("VALIDATIONS", `Error loading validations: ${error}`);
    }
}

/**
 * Run validations based on command options
 */
export async function runValidations(
    ctx: ExecutionContext,
    options: Options | undefined
): Promise<boolean> {

    if (!options) return true;

    const validationNames: string[] = [];

    if (options.devOnly) validationNames.push("devOnly");

    if (options.userPermissions?.length) {
        ctx.args = ctx.args || {};
        ctx.args.permissions = options.userPermissions;
        validationNames.push("userPermissions");
    }

    if (options.botPermissions?.length) {
        ctx.args = ctx.args || {};
        ctx.args.permissions = options.botPermissions;
        validationNames.push("botPermissions");
    }

    if (options.guildOnly) validationNames.push("guildOnly");

    for (const name of validationNames) {
        const validation = validations[name];
        if (validation) {
            const passed = await validation.execute(ctx);
            if (!passed) return false;
        } else {
            logger.warn("VALIDATIONS", `Unknown validation: ${name}`);
        }
    }

    return true;
}