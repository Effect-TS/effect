---
"effect": minor
---

Add request-level dependencies to `McpServer`, so tools, resources and prompts can use services that only exist per request, such as the current user.

- Services a tool declares with `dependencies`, and services read by resource, prompt and completion handlers, are now request-level: registrations carry them as `McpServer.McpRequest<"Requires", S>` and they must be provided by the new `McpServer.middleware` or by the transport. Providing them with `Layer.provide` no longer satisfies them; read construction-time services in `Layer.unwrap` and close over them. Parameter decoding and result encoding services are still required at registration.
- `McpServer.toolkit`, `resource` and `prompt` now require `McpServer` instead of providing their own. Pass registrations to `layerStdio`, `layerHttp`, `layerHttpRequestScoped` or `layer` with the new `registrations` option, which builds them before the server serves its first request. On HTTP, request-level dependencies the transport doesn't supply become `HttpRouter` requirements, so `HttpRouter.middleware` can provide them.
- Request services now take precedence over services captured at registration, and handler finalizers run when the request ends instead of at shutdown.
- Defects in resource, resource template, prompt and completion handlers are now logged, reported and sent as `InternalError("Internal error")` instead of exposing the defect message, and interruption of those handlers propagates instead of becoming an `InternalError`.
- `McpServer.McpServer.layer` is typed as `Layer<McpServer>`, and `McpServer.decodeNameHeader` decodes the `Mcp-Name` header.
