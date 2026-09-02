---
"effect": patch
---

Fix `Optic.optionalKey` to splice array and tuple elements when deleting through a canonical string index such as `"1"`, matching numeric-index deletion instead of leaving a hole. Object-property deletion and non-index string keys are unchanged.
