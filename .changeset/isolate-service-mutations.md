---
"effect": patch
---

Isolate `AtomHttpApi` and `AtomRpc` mutations by service ID so services sharing endpoint names or RPC tags invoke their own clients with their own arguments. Generated mutation serialization keys now include the service ID; regenerate any persisted mutation snapshots and use matching versions and service IDs for server/client hydration. Query serialization keys are unchanged.
