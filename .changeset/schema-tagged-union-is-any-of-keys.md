---
"effect": minor
---

`isAnyOf` on `Schema.TaggedUnion` and `Schema.toTaggedUnion` unions now rejects keys that are not tags of the union, so misspelled tags and wide `string` arrays are type errors.

- Bound generic key parameters by the union's tags, for example `<K extends Types.Tags<typeof Shape.Type>>` or `<K extends keyof typeof Shape.cases>`, instead of `<K extends string>`.
- Narrow a `ReadonlyArray<string>` to the union's tags before passing it, for example with `names.filter(Schema.is(Schema.Literals(["Circle", "Square"])))`.
