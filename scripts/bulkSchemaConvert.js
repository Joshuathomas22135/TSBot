#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { performance } from "perf_hooks";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset} `, resolve);
  });
}

// Cache for parsed schemas to avoid re-parsing
const schemaCache = new Map();

/**
 * Convert filename to proper PascalCase, splitting on:
 * - hyphens, underscores, and camelCase boundaries.
 */
function toPascalCase(filename) {
  const nameWithoutExt = path.basename(filename, ".js");
  // Replace hyphens and underscores with spaces
  let spaced = nameWithoutExt.replace(/[-_]/g, " ");
  // Insert space before each uppercase letter (except first character)
  spaced = spaced.replace(/([A-Z])/g, " $1").trim();
  // Split by spaces, capitalize each word, join
  return spaced
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Convert filename to camelCase
 */
function toCamelCase(filename) {
  const pascalCase = toPascalCase(filename);
  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
}

/**
 * Transform a field name to consistent format:
 * - Capitalize first letter
 * - If the name ends with "Id", replace with "ID"
 */
function transformFieldName(name) {
  // First, capitalize first letter
  let transformed = name.charAt(0).toUpperCase() + name.slice(1);
  // If the transformed name ends with "Id", replace with "ID"
  if (transformed.endsWith("Id")) {
    transformed = transformed.slice(0, -2) + "ID";
  }
  return transformed;
}

/**
 * Fast file search using glob pattern matching
 */
function getAllJSFiles(dir) {
  const results = [];
  const stack = [dir];

  while (stack.length) {
    const currentDir = stack.pop();
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        stack.push(filePath);
      } else if (file.endsWith(".js")) {
        results.push(filePath);
      }
    }
  }

  return results;
}

/**
 * Optimized schema parsing with regex caching
 */
const fieldRegex =
  /\b(\w+)\s*:\s*\{?[^}]*?\btype\s*:\s*(?:Schema\.Types\.)?(\w+)/g;
const simpleFieldRegex =
  /\b(\w+)\s*:\s*(String|Number|Boolean|Date|Array|Object|Mixed|Buffer|Decimal128|Map)/g;
const requiredRegex = /\b(\w+)\s*:\s*\{[^}]*?\brequired\s*:\s*true\b/g;
const uniqueRegex = /\b(\w+)\s*:\s*\{[^}]*?\bunique\s*:\s*true\b/g;
const defaultRegex = /\b(\w+)\s*:\s*\{[^}]*?\bdefault\s*:\s*([^,\}]+)/g;

function parseSchema(content, filename) {
  // Check cache first
  const cacheKey = `${filename}:${content.length}`;
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey);
  }

  const schemaNameMatch = content.match(
    /(?:let|const|var)\s+(\w+)\s*=\s*new\s+Schema\(/,
  );
  const schemaName = schemaNameMatch
    ? schemaNameMatch[1]
    : toCamelCase(filename) + "Schema";

  const modelNameMatch = content.match(
    /(?:model|mongoose\.model)\s*\(\s*['"`](\w+)['"`]/,
  );
  const modelName = modelNameMatch ? modelNameMatch[1] : toPascalCase(filename);

  const schemaFields = {};

  // Reset regex lastIndex
  fieldRegex.lastIndex = 0;
  simpleFieldRegex.lastIndex = 0;

  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    schemaFields[match[1]] = { type: match[2], hasOptions: true };
  }

  while ((match = simpleFieldRegex.exec(content)) !== null) {
    if (!schemaFields[match[1]]) {
      schemaFields[match[1]] = { type: match[2], hasOptions: false };
    }
  }

  const requiredFields = [];
  requiredRegex.lastIndex = 0;
  while ((match = requiredRegex.exec(content)) !== null) {
    requiredFields.push(match[1]);
  }

  const uniqueFields = [];
  uniqueRegex.lastIndex = 0;
  while ((match = uniqueRegex.exec(content)) !== null) {
    uniqueFields.push(match[1]);
  }

  const defaultFields = [];
  defaultRegex.lastIndex = 0;
  while ((match = defaultRegex.exec(content)) !== null) {
    defaultFields.push({ field: match[1], value: match[2].trim() });
  }

  const hasTimestamps =
    content.includes("timestamps: true") ||
    content.includes("timestamps: {") ||
    content.includes("timestamps:true");

  const strictMode = !content.includes("strict: false");

  const result = {
    schemaName,
    modelName,
    originalFilename: path.basename(filename, ".js"),
    pascalName: toPascalCase(filename),
    camelName: toCamelCase(filename),
    fields: schemaFields,
    requiredFields,
    uniqueFields,
    defaultFields,
    hasTimestamps,
    strictMode,
  };

  // Cache the result
  schemaCache.set(cacheKey, result);

  return result;
}

// Pre-computed type maps for faster lookups
const mongoToTSMap = {
  String: "string",
  Number: "number",
  Boolean: "boolean",
  Date: "Date",
  Buffer: "Buffer",
  Mixed: "any",
  ObjectId: "string",
  Array: "any[]",
  Decimal128: "number",
  Map: "Map<string, any>",
};

const mongoTypeMap = {
  String: "String",
  Number: "Number",
  Boolean: "Boolean",
  Date: "Date",
  Buffer: "Buffer",
  Mixed: "Schema.Types.Mixed",
  ObjectId: "Schema.Types.ObjectId",
  Array: "Array",
  Decimal128: "Schema.Types.Decimal128",
  Map: "Map",
};

function mapMongoTypeToTS(mongoType) {
  return mongoToTSMap[mongoType] || "any";
}

function getMongoType(mongoType) {
  return mongoTypeMap[mongoType] || "Schema.Types.Mixed";
}

/**
 * Generate TypeScript interface - optimized string building
 */
function generateTypesFile(schemaData) {
  const { pascalName, fields, requiredFields, hasTimestamps } = schemaData;
  const interfaceName = `I${pascalName}`;

  const lines = [
    'import { Document } from "mongoose";',
    "",
    `export interface ${interfaceName} extends Document {`,
  ];

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    const isRequired = requiredFields.includes(fieldName);
    const tsType = mapMongoTypeToTS(fieldInfo.type);
    const transformedName = transformFieldName(fieldName);
    const fieldDef = isRequired ? transformedName : `${transformedName}?`;
    lines.push(`    ${fieldDef}: ${tsType};`);
  }

  if (hasTimestamps) {
    lines.push(`    createdAt?: Date;`);
    lines.push(`    updatedAt?: Date;`);
  }

  lines.push("}");

  return { interfaceName, code: lines.join("\n") };
}

/**
 * Generate TypeScript schema - optimized string building
 */
function generateSchemaFile(schemaData, interfaceName) {
  const {
    schemaName,
    pascalName,
    camelName,
    fields,
    requiredFields,
    uniqueFields,
    defaultFields,
    hasTimestamps,
    strictMode,
  } = schemaData;
  const modelExportName = `${pascalName}Model`;
  const interfaceFilename = `I${pascalName}`;

  const lines = [
    'import { model, Schema } from "mongoose";',
    `import { ${interfaceName} } from "../types/${interfaceFilename}.js";`,
    "",
    `const ${camelName}Schema = new Schema<${interfaceName}>(`,
    "    {",
  ];

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    const isRequired = requiredFields.includes(fieldName);
    const isUnique = uniqueFields.includes(fieldName);
    const hasDefault = defaultFields.find((d) => d.field === fieldName);
    const transformedName = transformFieldName(fieldName);

    lines.push(`        ${transformedName}: {`);
    lines.push(`            type: ${getMongoType(fieldInfo.type)},`);

    if (isRequired) lines.push("            required: true,");
    if (isUnique) lines.push("            unique: true,");
    if (hasDefault) lines.push(`            default: ${hasDefault.value},`);

    // Remove trailing comma and close
    lines.push("        },");
  }

  lines.push("    },");
  lines.push("    {");

  const options = [];
  if (hasTimestamps) options.push("        timestamps: true");
  if (!strictMode) options.push("        strict: false");

  lines.push(options.join(",\n"));
  lines.push("    }");
  lines.push(");");
  lines.push("");
  lines.push(
    `export const ${modelExportName} = model<${interfaceName}>("${pascalName}", ${camelName}Schema);`,
  );
  lines.push(`export default ${modelExportName};`);

  return { schemaCode: lines.join("\n"), modelExportName, interfaceName };
}

/**
 * Update types index file with export type
 */
function updateTypesIndexFile(typesDir, newInterfaces) {
  const indexPath = path.join(typesDir, "index.ts");

  let existingExports = new Set();
  let content = "";

  if (fs.existsSync(indexPath)) {
    const existingContent = fs.readFileSync(indexPath, "utf8");
    const exportRegex =
      /export\s+type\s*\{\s*([^}]+)\s*\}\s*from\s*["']([^"']+)["']/g;
    let match;
    while ((match = exportRegex.exec(existingContent)) !== null) {
      match[1]
        .split(",")
        .map((e) => e.trim())
        .forEach((exp) => existingExports.add(exp));
    }

    content = existingContent.trimEnd();
  } else {
    content = "// Auto-generated types index - DO NOT EDIT MANUALLY\n";
    content += "// Generated by bulkConvertSchemas.js\n\n";
  }

  const additions = [];
  for (const { interfaceName, interfaceFilename } of newInterfaces) {
    if (!existingExports.has(interfaceName)) {
      additions.push(
        `export type { ${interfaceName} } from "./${interfaceFilename}.js";`,
      );
    }
  }

  if (additions.length > 0) {
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    content += additions.join("\n") + "\n";
    fs.writeFileSync(indexPath, content);
    log(
      `   ✅ Updated types index: ${indexPath} (+${additions.length} new)`,
      colors.green,
    );
  } else {
    log(`   ⏭️  Types index unchanged`, colors.yellow);
  }
}

/**
 * Update exports file
 */
function updateExportsFile(exportsFilePath, modelExports, schemasDir) {
  const exportsDir = path.dirname(exportsFilePath);
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  let existingExports = new Set();
  if (fs.existsSync(exportsFilePath)) {
    const content = fs.readFileSync(exportsFilePath, "utf8");
    const exportRegex = /export\s*\{\s*([^}]+)\s*\}\s*from\s*["']([^"']+)["']/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      match[1]
        .split(",")
        .map((e) => e.trim())
        .forEach((exp) => existingExports.add(exp));
    }
  }

  const schemasRelativePath = path
    .relative(path.dirname(exportsFilePath), schemasDir)
    .replace(/\\/g, "/");
  const newExports = [];

  for (const { modelName, exportName } of modelExports) {
    if (!existingExports.has(exportName)) {
      const importPath = schemasRelativePath.startsWith(".")
        ? `${schemasRelativePath}/${modelName}.js`
        : `./${schemasRelativePath}/${modelName}.js`;
      newExports.push(`export { ${exportName} } from "${importPath}";`);
    }
  }

  if (newExports.length > 0) {
    let content = "";
    if (!fs.existsSync(exportsFilePath)) {
      content = "// Auto-generated exports file - DO NOT EDIT MANUALLY\n";
      content += "// Generated by bulkConvertSchemas.js\n\n";
    } else {
      content = fs.readFileSync(exportsFilePath, "utf8");
    }

    content += "\n" + newExports.join("\n");
    fs.writeFileSync(exportsFilePath, content);
    log(`   ✅ Added ${newExports.length} exports`, colors.green);
  }
}

/**
 * Process a single file
 */
async function processFile(
  filePath,
  jsBackupDir,
  schemasDir,
  typesDir,
  results,
) {
  try {
    const filename = path.basename(filePath);
    const baseFilename = path.basename(filePath, ".js");
    const content = await fs.promises.readFile(filePath, "utf8"); // Use async read for consistency
    const schemaData = parseSchema(content, filename);
    const interfaceFilename = `I${schemaData.pascalName}`;

    const schemaPath = path.join(schemasDir, `${baseFilename}.ts`);
    const typePath = path.join(typesDir, `${interfaceFilename}.ts`);
    const schemaExists = fs.existsSync(schemaPath);
    const typeExists = fs.existsSync(typePath);

    if (schemaExists && typeExists) {
      return {
        success: true,
        skipped: true,
        baseFilename,
        modelExportName: `${schemaData.pascalName}Model`,
        interfaceName: `I${schemaData.pascalName}`,
        interfaceFilename,
        originalFilename: baseFilename,
      };
    }

    const { interfaceName, code: typesCode } = generateTypesFile(schemaData);
    const { schemaCode, modelExportName } = generateSchemaFile(
      schemaData,
      interfaceName,
    );

    const writeOperations = [];
    if (!typeExists) {
      writeOperations.push(fs.promises.writeFile(typePath, typesCode));
    }
    if (!schemaExists) {
      writeOperations.push(fs.promises.writeFile(schemaPath, schemaCode));
    }
    writeOperations.push(
      fs.promises.copyFile(filePath, path.join(jsBackupDir, filename)),
    );

    await Promise.all(writeOperations); // This will throw if any write fails

    return {
      success: true,
      skipped: false,
      baseFilename,
      modelExportName,
      interfaceName,
      interfaceFilename,
      originalFilename: baseFilename,
    };
  } catch (error) {
    return {
      success: false,
      file: path.basename(filePath),
      error: error.message,
    };
  }
}

/**
 * Main function with parallel processing
 */
async function main() {
  log("\n📦 BULK JS TO TS SCHEMA CONVERTER", colors.magenta);
  log("═══════════════════════════════════════════\n", colors.magenta);

  const startTime = performance.now();

  const sourceDir = await askQuestion(
    "📂 Enter the source folder containing JS schema files:",
  );

  if (!fs.existsSync(sourceDir)) {
    log(`❌ Folder not found: ${sourceDir}`, colors.red);
    rl.close();
    return;
  }

  log("\n🔍 Scanning for JS files...", colors.yellow);
  const jsFiles = getAllJSFiles(sourceDir);

  if (jsFiles.length === 0) {
    log(`❌ No JS files found in ${sourceDir}`, colors.red);
    rl.close();
    return;
  }

  log(
    `📋 Found ${colors.green}${jsFiles.length}${colors.reset} JS schema files`,
  );

  log("\n", colors.reset);
  const defaultJsBackupDir = path.join(
    process.cwd(),
    "src",
    "database",
    "js-schemas",
  );
  const jsBackupDir =
    (await askQuestion(
      `📁 Backup original JS files to (default: ${defaultJsBackupDir}):`,
    )) || defaultJsBackupDir;

  const defaultSchemasDir = path.join(
    process.cwd(),
    "src",
    "database",
    "schemas",
  );
  const schemasDir =
    (await askQuestion(
      `📁 Output TS schemas to (default: ${defaultSchemasDir}):`,
    )) || defaultSchemasDir;

  const defaultTypesDir = path.join(process.cwd(), "src", "database", "types");
  const typesDir =
    (await askQuestion(
      `📁 Output TS types to (default: ${defaultTypesDir}):`,
    )) || defaultTypesDir;

  const defaultExportsFile = path.join(
    process.cwd(),
    "src",
    "database",
    "index.ts",
  );
  const exportsFile =
    (await askQuestion(
      `📄 Export all models to file (default: ${defaultExportsFile}):`,
    )) || defaultExportsFile;

  log("\n📁 Creating directories...", colors.yellow);

  // Create directories in parallel
  await Promise.all([
    fs.promises.mkdir(jsBackupDir, { recursive: true }),
    fs.promises.mkdir(schemasDir, { recursive: true }),
    fs.promises.mkdir(typesDir, { recursive: true }),
  ]);

  log("\n⚙️ Converting files...", colors.yellow);

  // Determine optimal concurrency (CPU cores - 1)
  const concurrency = Math.max(1, os.cpus().length - 1);
  log(`   Using ${concurrency} parallel workers`, colors.gray);

  // Process files in batches for optimal performance
  const batchSize = concurrency * 2;
  const results = {
    newConversions: [],
    skipped: [],
    failed: [],
  };

  for (let i = 0; i < jsFiles.length; i += batchSize) {
    const batch = jsFiles.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((file) =>
        processFile(file, jsBackupDir, schemasDir, typesDir, results),
      ),
    );

    for (const result of batchResults) {
      if (result.success) {
        if (result.skipped) {
          results.skipped.push(result);
          log(
            `   ⏭️  ${result.baseFilename}.js already converted`,
            colors.yellow,
          );
        } else {
          results.newConversions.push(result);
          log(`   ✅ ${result.baseFilename}.js →`, colors.green);
        }
      } else {
        results.failed.push(result);
        log(`   ❌ ${result.file}: ${result.error}`, colors.red);
      }
    }

    // Show progress
    const progress = Math.min(i + batchSize, jsFiles.length);
    log(`   Progress: ${progress}/${jsFiles.length} files`, colors.gray);
  }

  // Update files in parallel
  const updateOperations = [];

  if (results.newConversions.length > 0) {
    updateOperations.push(
      (async () => {
        log("\n📝 Updating exports file...", colors.yellow);
        updateExportsFile(
          exportsFile,
          results.newConversions.map((r) => ({
            modelName: r.baseFilename,
            exportName: r.modelExportName,
          })),
          schemasDir,
        );
      })(),
    );

    updateOperations.push(
      (async () => {
        log("📝 Updating types index...", colors.yellow);
        updateTypesIndexFile(
          typesDir,
          results.newConversions.map((r) => ({
            interfaceName: r.interfaceName,
            interfaceFilename: r.interfaceFilename,
          })),
        );
      })(),
    );
  }

  await Promise.all(updateOperations);

  const endTime = performance.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  // Show summary
  log("\n📊 Conversion Complete!", colors.magenta);
  log("═══════════════════════════════════════════", colors.magenta);
  log(
    `✅ Newly converted: ${results.newConversions.length} files`,
    colors.green,
  );
  if (results.skipped.length > 0) {
    log(
      `⏭️  Skipped (already converted): ${results.skipped.length} files`,
      colors.yellow,
    );
  }
  if (results.failed.length > 0) {
    log(`❌ Failed: ${results.failed.length} files`, colors.red);
  }
  log(`⏱️  Time taken: ${totalTime}s`, colors.cyan);

  log("\n📂 File Locations:", colors.cyan);
  log(`   • Original JS backup: ${jsBackupDir}`, colors.green);
  log(`   • TS Schemas: ${schemasDir}`, colors.green);
  log(`   • TS Types: ${typesDir}`, colors.green);
  log(`   • Types Index: ${path.join(typesDir, "index.ts")}`, colors.green);
  log(`   • Exports file: ${exportsFile}`, colors.green);

  log("\n✨ Bulk conversion complete!", colors.green);
  log("═══════════════════════════════════════════\n", colors.green);

  rl.close();
}

// Run the script
main().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}`, colors.red);
  rl.close();
});
