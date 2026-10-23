import type { ConfigFile } from "@rtk-query/codegen-openapi";
const config: ConfigFile = {
    schemaFile: process.env.WORKDESK_SCHEMA_URL ?? "http://127.0.0.1:5284/swagger/v1/swagger.json",
    apiFile: "./src/api/api.ts",
    apiImport: "api",
    outputFile: "./src/api/autogen/workdesk.ts",
    exportName: "workdeskApi",
    argSuffix: "Request",
    responseSuffix: "Response",
    hooks: true,
    tag: true
};
export default config;
