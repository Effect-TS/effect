---
name: type-testing
description: Type correctness testing. Use for Tstyche assertions covering inference, assignability, or displayed public types under packages/*/typetest.
---

Type-level tests live in `packages/*/typetest/` and use Tstyche. Inspect nearby
`.tst.ts` files before editing and use their imports and assertion style.

Run a targeted test from the repository root:

```sh
pnpm test-types <filename>
```

The root command targets every configured TypeScript version. Keep the filename
target narrow; do not run all type tests unless the change affects shared test
infrastructure.

## Assertions

Use ordinary Tstyche assertions such as `toBe` for structural type equality and
the appropriate Tstyche assertion for inference or assignability behavior.

Structural equality cannot catch a public type that is semantically correct but
displays an internal alias or unsimplified intersection in editor quick info.
For displayed types, deliberately produce an assignment error and match a
distinctive substring with Tstyche's checked `@ts-expect-error` message:

```ts
it("simplifies the displayed type", () => {
  const value = null as unknown as PublicType

  // @ts-expect-error Type '{ readonly value: string; }'
  const displayed: never = value

  void displayed
})
```

Before accepting a displayed-type test, temporarily restore the broken type and
confirm that the diagnostic-message match fails. Keep the expected substring as
small as possible while still distinguishing the public type from the leaked
implementation type because TypeScript diagnostic wording can change.

## Validation

Run the targeted `pnpm test-types <filename>` command after the change. The task
is complete when it passes and every applicable check in the root `AGENTS.md`
validation matrix passes.
