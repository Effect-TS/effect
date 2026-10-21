---
"effect": patch
---

Fix `Yaml.parse` rejecting anchors defined inside flow collections, such as `{a: &ref 1, b: *ref}`.
