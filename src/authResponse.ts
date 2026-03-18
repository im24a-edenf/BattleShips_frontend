import type { User } from './AuthContext';

type UnknownRecord = Record<string, unknown>;

interface AuthPayload {
    user: User;
    token: string;
}

const isRecord = (value: unknown): value is UnknownRecord => {
    return typeof value === 'object' && value !== null;
};

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            if (typeof entry === 'string') {
                return entry;
            }

            if (isRecord(entry) && typeof entry.authority === 'string') {
                return entry.authority;
            }

            return null;
        })
        .filter((entry): entry is string => entry !== null);
};

const getTokenFromRecord = (record: UnknownRecord): string | null => {
    const tokenKeys = ['token', 'accessToken', 'access_token', 'jwt', 'jwtToken', 'bearerToken'];

    for (const key of tokenKeys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    return null;
};

const normalizeUser = (value: unknown): User | null => {
    if (!isRecord(value)) {
        return null;
    }

    const idCandidate = value.id ?? value.userId;
    const emailCandidate = value.email ?? value.username;

    if (typeof idCandidate !== 'string' || typeof emailCandidate !== 'string') {
        return null;
    }

    const roles = toStringArray(value.roles ?? value.authorities);

    return {
        id: idCandidate,
        email: emailCandidate,
        roles,
    };
};

export const parseAuthResponse = (data: unknown): AuthPayload => {
    if (!isRecord(data)) {
        throw new Error('Authentication response is not an object.');
    }

    const directUser = normalizeUser(data);
    const nestedUser = normalizeUser(data.user);
    const user = nestedUser ?? directUser;

    if (!user) {
        throw new Error('Authentication response does not contain a valid user.');
    }

    const nestedToken = isRecord(data.user) ? getTokenFromRecord(data.user) : null;
    const token = getTokenFromRecord(data) ?? nestedToken;

    if (!token) {
        throw new Error('Authentication response does not contain a valid token.');
    }

    return { user, token };
};