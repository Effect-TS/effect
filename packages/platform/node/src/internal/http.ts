import type * as Http from "node:http"
import type * as Https from "node:https"
import { createRequire } from "node:module"

// ESM imports of node:http snapshot its lazy WebSocket exports, loading undici
// even when no web APIs are used. Keep the CommonJS objects instead. The
// filename fallback also supports bundlers emitting CommonJS on Node 18.
const require = createRequire(typeof __filename === "string" ? __filename : import.meta.url)

export const http: typeof Http = require("node:http")
export const https: typeof Https = require("node:https")
