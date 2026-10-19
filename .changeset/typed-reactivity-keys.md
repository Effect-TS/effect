---
"effect": patch
---

Add opt-in typed reactivity keys. Augment `Reactivity.Keys` to map key names to ID types, and the public reactivity APIs (`Reactivity`, `Atom`, `AtomHttpApi`, `AtomRpc`, `SqlClient.reactive` and `EventLog.groupReactivity`) reject undeclared key names and mismatched IDs. With no keys declared, the accepted types are unchanged.
