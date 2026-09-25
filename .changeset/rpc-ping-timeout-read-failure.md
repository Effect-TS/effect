---
"@effect/rpc": patch
---

Report a missed pong in `RpcClient.makeProtocolSocket` as a `Read` socket error, so in-flight requests fail instead of hanging when `retryTransientErrors` is enabled.
