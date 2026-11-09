---
"effect": patch
---

Speed up type-checking of flat `RpcClient` calls and `AtomRpc` `query` / `mutation` for large RPC groups. Selecting an RPC by tag no longer tests every RPC in the group, which cuts instantiations about 5x and brings peak checker memory down to roughly the level of the object-shaped client.

The flat client's `asQueue: true` result now includes `Cause.Done` in the dequeue error type, matching the object-shaped client and the runtime, which ends the queue with `Queue.end`.

Adds the `Rpc.ByTag`, `RpcClient.RpcClient.Options`, `RpcClient.RpcClient.Result`, `AtomRpc.Query` and `AtomRpc.Mutation` utility types.
