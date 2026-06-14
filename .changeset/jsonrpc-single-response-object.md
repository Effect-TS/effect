---
"@effect/rpc": patch
"@effect/ai": patch
---

Make the MCP Streamable HTTP transport conform to the 2025-06-18 specification so spec-conformant clients (Claude Desktop and Claude Code) can connect.

- `@effect/rpc`: the JSON-RPC serialization now replies to a single request with a single response object instead of a one-element array. Batch requests still receive an array. MCP 2025-06-18 removed JSON-RPC batching, and clients built to that revision reject array-wrapped responses.
- `@effect/ai`: `McpServer.layerHttp` and `McpServer.layerHttpRouter` now answer `GET` and `DELETE` on the MCP path with `405 Method Not Allowed` (advertising `Allow: POST`) instead of `404`, since the transport is stateless and serves MCP over `POST` only.
