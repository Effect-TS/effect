---
"effect": patch
---

Keep RPC and MCP stdio servers answering after a malformed NDJSON line, replying with a JSON-RPC `-32700` parse error and still handling the other frames. `RpcSerialization`'s `makeUnsafe` accepts `onDecodeError` to receive malformed NDJSON frames instead of throwing, and a throwing NDJSON decode now discards its pending UTF-8 bytes.
