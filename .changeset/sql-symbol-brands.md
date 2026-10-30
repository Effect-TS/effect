---
"effect": patch
---

Brand SQL fragments and segments with the new `Statement.FragmentTypeId` and `Statement.SegmentTypeId` symbols, so `sql` interpolation binds plain objects shaped like fragments or segments as parameters instead of SQL; build fragments and segments with the `Statement` constructors.
