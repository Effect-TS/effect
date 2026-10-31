---
"effect": patch
---

Add `SchemaBinary.int32`, `uint32`, `int64` and `uint64`, opt-in schemas that write integers as fixed-width little-endian payloads. The 32-bit schemas decode to `number` and the 64-bit schemas to `bigint`. Out-of-range and non-integer values are rejected instead of wrapped.
