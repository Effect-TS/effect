---
"effect": patch
---

Narrow `Predicate.isTagged` to the matching members of its input type instead of always widening to `{ _tag: K }`.

Narrowing a union that mixes an exact tag with a wider one, such as `{ _tag: "a"; a: string } | { _tag: "a" | "b"; b: number }`, now keeps both members, so code that read fields of the exact member alone must check for them first.
