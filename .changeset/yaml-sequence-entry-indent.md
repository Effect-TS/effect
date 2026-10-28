---
"effect": patch
---

Fix `Yaml.parse` rejecting block sequence entries whose mapping starts more than one space after the dash. The mapping is now indented to its first key, so later keys must align with it, and a tab between the dash and the first key is rejected.
