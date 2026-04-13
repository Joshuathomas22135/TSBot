export enum LogLevel {
    INFO = "INFO",
    SUCCESS = "SUCCESS",
    WARN = "WARN",
    ERROR = "ERROR",
    VERBOSE = "VERBOSE"
}

const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
    dim: "\x1b[2m"
};

const categoryColors = {
    HANDLER: colors.magenta,
    COMMAND: colors.cyan,
    BUTTON: colors.blue,
    EVENT: colors.green,
    MODAL: colors.yellow,
    SELECT: colors.yellow,
    CONTEXT: colors.magenta,
    DATABASE: colors.blue,
    BOT: colors.cyan,
    REGISTRY: colors.green,
    SYSTEM: colors.gray,
    VALIDATION: colors.yellow
};

export class Logger {
    private verboseEnabled: boolean = false;

    constructor(verbose: boolean = false) {
        this.verboseEnabled = verbose;
    }

    setVerbose(verbose: boolean): void {
        this.verboseEnabled = verbose;
    }

    info(category: string, message: string): void {
        const color = categoryColors[category as keyof typeof categoryColors] || colors.cyan;
        console.log(`${color}[${category}]${colors.reset} ${message}`);
    }

    success(category: string, message: string): void {
        const color = categoryColors[category as keyof typeof categoryColors] || colors.green;
        console.log(`${color}[${category}]${colors.reset} ${colors.green}✓${colors.reset} ${message}`);
    }

    warn(category: string, message: string): void {
        console.log(`${colors.yellow}[${category}]${colors.reset} ⚠ ${message}`);
    }

    error(category: string, message: string): void {
        console.log(`${colors.red}[${category}]${colors.reset} ✗ ${message}`);
    }

    verbose(category: string, message: string): void {
        if (this.verboseEnabled) {
            console.log(`${colors.dim}[${category}] ${message}${colors.reset}`);
        }
    }

    // Section should ALWAYS show regardless of verbose mode
    section(title: string): void {
        // No verbose check here - always show
        console.log(`\n${colors.magenta}═══════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.cyan}  ${title}${colors.reset}`);
        console.log(`${colors.magenta}═══════════════════════════════════════════════${colors.reset}\n`);
    }

    summary(title: string, items: Record<string, number>): void {
        console.log(`\n${colors.green}📊 ${title}${colors.reset}`);
        console.log(`${colors.dim}───────────────────────────────${colors.reset}`);

        for (const [key, value] of Object.entries(items)) {
            const icon = value > 0 ? '✅' : '⬜';
            console.log(`${icon} ${key.padEnd(15)}: ${value > 0 ? colors.green + value : colors.gray + value}${colors.reset}`);
        }

        console.log(`${colors.dim}───────────────────────────────${colors.reset}\n`);
    }

    line(): void {
        console.log(colors.dim + "────────────────────────────────────────" + colors.reset);
    }

    clear(): void {
        console.clear();
    }

    progress(current: number, total: number, message: string): void {
        if (this.verboseEnabled) {
            const percentage = Math.round((current / total) * 100);
            const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
            console.log(`${colors.cyan}[${bar}]${colors.reset} ${percentage}% - ${message}`);
        }
    }
}

export const logger = new Logger();
export const setVerbose = (verbose: boolean) => logger.setVerbose(verbose);