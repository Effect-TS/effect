---
name: effect-development
description: Effect development guidance. Use when implementing or reviewing code that composes Effect APIs or patterns, or that adds or changes API signatures.
---

Use the repository's AI documentation as targeted reference, not ambient
context:

1. Identify the Effect APIs and concepts involved in the change.
2. Search `LLMS.md` and `ai-docs/src` for those names and concepts, then read
   the matching sections and examples.
3. Apply the relevant guidance and inspect nearby source and tests for any
   repository-internal conventions not covered by the documentation.

The task is ready for implementation when every material Effect API or pattern
has matching local guidance, or the search has established that none exists.

## API conventions

Write option types inline in the signature. Do not declare a separate
`interface` or type alias for a function's options, even when the option list
is long. Mark fields `readonly` and add `| undefined` to optional fields:

```ts
export const make = (options: {
  readonly capacity: number
  readonly strategy?: "dropping" | "sliding" | undefined
}): Effect.Effect<Queue> => ...
```
