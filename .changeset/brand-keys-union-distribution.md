---
"effect": patch
---

Fix `Brand.Keys` collapsing the keys of a union of branded types to their common keys. It now distributes over the union, so `Schema.fromBrand` keeps every member's brand keys instead of only the shared ones (for example a distributed union of `Branded<string, "MIDIPortId"> & Brand<"input">` and `Branded<string, "MIDIPortId"> & Brand<"output">` now yields `"MIDIPortId" | "input" | "output"` rather than just `"MIDIPortId"`).
