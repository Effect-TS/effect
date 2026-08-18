---
"effect": patch
---

Resolve `Match` terminal combinators for `Match.value` on generic inputs.

`Match.value` used to place the provided input type in the `Matcher` union's
`Provided` slot, so terminal combinators branched on `[Pr] extends [never]` to
tell the two matcher flavors apart. When the input type contained a type
parameter, TypeScript deferred that conditional and the whole pipeline failed
to typecheck, even though every arm was fine:

```ts
type Closed = { readonly _tag: "Closed" }

const describe = <Open extends { readonly _tag: "Open" }>(
  state: Closed | Open,
  describeOpen: (open: Open) => string
): string =>
  Match.value(state).pipe(
    Match.tag("Closed", () => "closed"),
    Match.orElse((open) => describeOpen(open)) // was: unresolved conditional type
  )
```

`Match.value` now marks the matcher with the fixed literal `"value"` in that
slot instead of the input type, so the flavor check resolves eagerly and
generic inputs work with every terminal combinator (`orElse`, `orElseAbsurd`,
`exhaustive`, `option`, `result`, and friends). `ValueMatcher` still carries
the real provided type.

Note for hand-written annotations: the fifth type argument of `Matcher` for a
value matcher is now `"value"` rather than the input type, so annotations such
as `Matcher<A, F, RA, R, A>` should become `Matcher<A, F, RA, R, "value">`.
Type-matcher annotations (`Pr = never`) are unchanged.
