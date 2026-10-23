import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
export const api = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: "/",
        credentials: "include",
        prepareHeaders: (headers) => {
            headers.set("X-Workdesk", "1");
            return headers;
        }
    }),
    endpoints: () => ({})
});
