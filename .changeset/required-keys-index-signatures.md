---
"effect": patch
---

Fix `Types.RequiredKeys` to retain named required properties on types with index signatures, including generic records. For example, `{ a: number; [key: string]: number }` now yields `"a"` instead of `never`. This more accurate result can tighten annotations derived from `RequiredKeys`; update those annotations to include the named required keys. Runtime behavior is unchanged.
