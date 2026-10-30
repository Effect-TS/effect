---
"effect": minor
---

SQL fragments and segments are now branded with the new `Statement.FragmentTypeId` and `Statement.SegmentTypeId` symbols. `sql` interpolation binds unbranded look-alike objects as parameters, and `Statement.isFragment` and `Statement.isCustom` return `false` for them.

- Build fragments and segments with the `Statement` constructors, such as `Statement.fragment`, `Statement.literal`, `Statement.identifier` and `Statement.custom`, instead of object literals. Object literals no longer type check, and the `sql` template binds them as parameters.
