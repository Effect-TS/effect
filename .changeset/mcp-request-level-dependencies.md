---
"effect": minor
---

Add request-level dependencies and middleware to `McpServer`.

- Tool `dependencies` and services read by resource, prompt and completion handlers become `McpRequest<"Requires", S>` requirements. Supply them through `McpServer.middleware` or the transport, not `Layer.provide`. For construction-time services, read them in `Layer.unwrap` and close over them. Schema services remain registration-time requirements unless also declared or read by a handler.
- `toolkit`, `resource` and `prompt` registration layers now require `McpServer`. Pass them through a transport's `registrations` option to build them before the first request. HTTP transports convert remaining request dependencies into `HttpRouter` requirements.
- Request services override registration services, and handler finalizers run at request end.
- Resource, resource template, prompt and completion handler defects are logged, reported and returned as `InternalError("Internal error")`; interruptions propagate.
- Type `McpServer.McpServer.layer` as `Layer<McpServer>` and add `McpServer.decodeNameHeader` to decode `Mcp-Name` headers.
