---
"effect": patch
---

Fix `Types.RequiredKeys` to retain named required properties on indexed object types, including intersections and unions whose members share the same required key. This can tighten annotations derived from `RequiredKeys`; update them to include those named keys. Runtime behavior is unchanged.
