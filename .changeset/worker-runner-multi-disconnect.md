---
"effect": patch
---

Forward every worker-runner client disconnect to the RPC server, not just the first one.

`RpcServer.makeProtocolWorkerRunner` consumed the platform's `disconnects` queue with a single `Queue.take`, so the forwarding fiber completed after the first disconnected client. For multi-client worker runners (for example several `MessagePort` clients attached to one runner), the second and later disconnected clients never reached `server.disconnect`, leaking their request scopes and stream fibers on the server.
