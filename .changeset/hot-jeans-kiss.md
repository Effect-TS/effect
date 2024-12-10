---
"@effect/vitest": patch
---

Allow passing fast-check parameters to prop function

```ts
it.effect.prop(
  "adds context",
  [realNumber],
  ([num]) =>
    Effect.gen(function* () {
      const foo = yield* Foo
      expect(foo).toEqual("foo")
      return num === num
    }),
  { fastCheck: { numRuns: 200 } }
)
```
