import pkg from "../../package.json";

// Keydrop 版本號，來自 package.json；安裝回報與 MCP 伺服器資訊共用。
export const KEYDROP_VERSION: string = pkg.version;
