---
"effect": patch
---

Add opt-in typed reactivity keys. Applications can augment `Reactivity.Keys` to map key names to ID types, after which `Reactivity.mutation`, `query`, `stream` and `invalidate`, `Atom.withReactivity`, the `reactivityKeys` options of `Atom`, `AtomHttpApi` and `AtomRpc`, `SqlClient.reactive` and `reactiveMailbox`, and `EventLog.groupReactivity` reject undeclared key names and mismatched IDs. With no keys declared, the accepted types are unchanged. Methods on the `Reactivity` service still accept any key.
