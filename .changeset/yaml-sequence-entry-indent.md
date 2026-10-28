---
"effect": patch
---

Fix `Yaml.parse` rejecting block sequence entry mappings whose first key sits more than one space after the dash. Later keys in the entry must now align with the first key, and a tab before the first key is rejected.
