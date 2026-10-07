---
"effect": patch
---

RPC client and server spans now set span kind `client` / `server` and record the OpenTelemetry `rpc.system.name` (`effect_rpc`) and `rpc.method` attributes. User `spanAttributes` still override them.

Default span names are now the RPC method, for example `Echo.Ping` instead of `RpcClient.Echo.Ping`. Update dashboards, alerts or samplers that match the old names, or pass `spanPrefix: "RpcClient"` / `spanPrefix: "RpcServer"` to keep them. Spans with an explicit `spanPrefix` keep their existing names.
