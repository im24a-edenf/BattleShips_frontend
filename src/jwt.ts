const decodeBase64Url = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
};

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
    const parts = token.split('.');
    if (parts.length < 2) {
        return null;
    }

    try {
        const payload = decodeBase64Url(parts[1]);
        const parsed = JSON.parse(payload);

        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
};

export const getJwtExpirationMs = (token: string): number | null => {
    const payload = parseJwtPayload(token);
    if (!payload) {
        return null;
    }

    const exp = payload.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) {
        return null;
    }

    return exp * 1000;
};

export const isJwtExpired = (token: string, clockSkewMs = 0): boolean => {
    const expirationMs = getJwtExpirationMs(token);
    if (expirationMs === null) {
        return true;
    }

    return Date.now() >= expirationMs - clockSkewMs;
};

export const getJwtMsUntilExpiry = (token: string, clockSkewMs = 0): number | null => {
    const expirationMs = getJwtExpirationMs(token);
    if (expirationMs === null) {
        return null;
    }

    return expirationMs - clockSkewMs - Date.now();
};
