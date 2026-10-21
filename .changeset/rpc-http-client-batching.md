---
"effect": patch
---

Add an opt-in `batch` option to `RpcClient.layerProtocolHttp` and `RpcClient.makeProtocolHttp` that sends concurrent RPC requests from the same client in one HTTP request.
