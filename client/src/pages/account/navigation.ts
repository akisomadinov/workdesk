export function safeReturnTo(value: string | null): string {
    if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/";
    const pathname = value.split(/[?#]/)[0].replace(/\/$/, "");
    if (["/login", "/register"].includes(pathname)) return "/";
    return value;
}
export function accountPath(mode: "login" | "register", returnTo: string): string {
    const destination = safeReturnTo(returnTo);
    return `/${mode}${destination === "/" ? "" : `?returnTo=${encodeURIComponent(destination)}`}`;
}
