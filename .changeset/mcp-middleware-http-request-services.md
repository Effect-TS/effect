---
"effect": patch
---

Let `McpServer` middleware and visibility layers receive per-request services from `HttpRouter.middleware` under `layerHttp`. Unmet per-request services now stay as `McpRequest<"Requires", S>` layer requirements, replacing `MissingRequestDependencies`.
