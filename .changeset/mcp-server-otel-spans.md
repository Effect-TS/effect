---
"effect": patch
---

Trace `McpServer` requests with spans that follow the OpenTelemetry MCP semantic conventions.

Spans are now named `{method} {target}` (for example `tools/call get_weather`) and carry `mcp.*`, `jsonrpc.request.id` and `gen_ai.*` attributes instead of the generic `rpc.*` ones. A W3C `traceparent` in `params._meta` continues the client's trace. Tool results with `isError: true` set `error.type` to `tool_error`, and JSON-RPC errors set `rpc.status_code`.

`Toolkit.handle` no longer records tool arguments on the current span by default. It records `gen_ai.tool.name` and `gen_ai.tool.call.id` instead of `tool` and `parameters`. Provide `Toolkit.RecordToolArguments` as `true` to record arguments in `gen_ai.tool.call.arguments`.

`RpcServer.make` accepts an `onRequest` option that wraps the effect running each request's middleware and handler. The callback also receives the decoded request.
