---
"effect": patch
---

Fix default variant extraction for `VariantSchema` classes so decoding preserves class instances and their methods. For example, `Model.extract(Person, "select")` now decodes to a `Person` rather than a plain object. Nondefault variants and named schemas such as `Person.select` remain plain field projections.
