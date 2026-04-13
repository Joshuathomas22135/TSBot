export function parseDuration(durationString: string): number {
    const regex = /(\d+)([hdmy])/g;
    let duration = 0;
    let match;
    let hasMatch = false;

    while ((match = regex.exec(durationString))) {
        hasMatch = true;
        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case "h":
                duration += value * 60 * 60 * 1000;
                break;
            case "d":
                duration += value * 24 * 60 * 60 * 1000;
                break;
            case "m":
                duration += value * 30.44 * 24 * 60 * 60 * 1000; // approximate month
                break;
            case "y":
                duration += value * 365 * 24 * 60 * 60 * 1000;
                break;
        }
    }

    if (!hasMatch || regex.lastIndex !== durationString.length) {
        return NaN;
    }

    return duration;
}

export function scheduleUnmute(
    member: { roles: { remove: (roleId: string) => Promise<unknown> } } | null | undefined,
    roleId: string | null | undefined,
    delayMs: number
) {
    if (!member || !roleId) return;
    const MAX_TIMEOUT = 2147483647; // ~24.8 days

    const schedule = (remainingMs: number) => {
        if (remainingMs <= 0) {
            member.roles.remove(roleId).catch(() => null);
            return;
        }
        const timeoutMs = Math.min(remainingMs, MAX_TIMEOUT);
        setTimeout(() => {
            schedule(remainingMs - timeoutMs);
        }, timeoutMs);
    };

    schedule(delayMs);
}
