import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
const baseQuery = fetchBaseQuery({
    baseUrl: "/",
    credentials: "include",
    prepareHeaders: (headers) => {
        headers.set("X-Workdesk", "1");
        return headers;
    }
});
export const api = createApi({
    reducerPath: "api",
    tagTypes: ["Auth"],
    baseQuery: async (args, context, extraOptions) => {
        const result = await baseQuery(args, context, extraOptions);
        const url = typeof args === "string" ? args : args.url;
        if (result.error?.status === 401 && !url.toLowerCase().startsWith("/api/auth"))
            context.dispatch(api.util.invalidateTags(["Auth"]));
        return result;
    },
    endpoints: () => ({})
});
