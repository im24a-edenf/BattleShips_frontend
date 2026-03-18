const LOGIN_REASON_PARAM = 'reason';

export const createLoginPath = (reason?: string) => {
    if (!reason) {
        return '/login';
    }

    const searchParams = new URLSearchParams({
        [LOGIN_REASON_PARAM]: reason,
    });

    return `/login?${searchParams.toString()}`;
};

export const redirectToLogin = (reason?: string) => {
    window.location.replace(createLoginPath(reason));
};

export const getLoginReason = (searchParams: URLSearchParams) => {
    const reason = searchParams.get(LOGIN_REASON_PARAM);
    return reason && reason.trim() ? reason : null;
};