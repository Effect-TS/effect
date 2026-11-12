---
"effect": patch
---

Keep serving RPC and MCP stdio after a malformed NDJSON line. The server answers JSON-RPC with a `-32700` parse error and still handles the other frames in the same chunk, instead of retrying the whole stdin stream, which lost input that cannot be replayed. The NDJSON decoder also clears its pending UTF-8 bytes after a malformed frame, and `Parser.decode` takes an optional `onError` that reports each malformed frame and keeps decoding.
