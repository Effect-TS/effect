---
"effect": patch
---

Default RPC span names no longer include the `RpcClient.`/`RpcServer.` prefix; pass `spanPrefix` to restore them. RPC client and server spans now also set kind `client` / `server` and record the OpenTelemetry `rpc.system.name` (`effect_rpc`) and `rpc.method` attributes.
