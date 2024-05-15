/* eslint-disable require-yield */
import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

const fn = Effect.functionWithSpan({
  options: (n) => ({ name: `fn-${n}` }),
  body: <A>(a: A) =>
    Effect.sync(() => {
      expect(a).toBe({ foo: 2 })
    })
})

it.effect("should work", () =>
  Effect.gen(function*() {
    yield* fn({ foo: 0 })
  }))
