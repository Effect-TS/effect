---
"effect": patch
---

Fix `isAnyOf` on `Schema.TaggedUnion` and `Schema.toTaggedUnion` unions accepting keys that are not tags of the union, so misspelled tags and wide `string` arrays are now type errors.

- Bound generic key parameters by the union's tags, for example `<K extends Types.Tags<typeof Shape.Type>>` or `<K extends keyof typeof Shape.cases>`, instead of `<K extends string>`.
- For a tag list only known at runtime, use a plain boolean predicate such as `(value: Shape): boolean => names.includes(value._tag)`. Filtering the list down to the union's tags makes `isAnyOf` compile, but its false branch then excludes every tag in the filtered type, even if the list is empty at runtime.
