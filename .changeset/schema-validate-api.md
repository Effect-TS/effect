---
"effect": minor
---

Add `Schema.validate`, an options-aware boolean validator for accept/reject boundaries. It honours parse options such as `onExcessProperty: "error"` without constructing issue details on the accept path. `Schema.is` is unchanged as a single-argument type guard for backwards compatibility: an options overload conflicts with `Array.prototype.filter` callbacks and removes type-predicate narrowing.
