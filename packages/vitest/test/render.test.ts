/* eslint-disable require-yield */
import { expect, it } from "@effect/vitest"
import { Cause, Effect } from "effect"

const fn = Effect.functionWithSpan({
  options: (n) => ({ name: `fn-${n}` }),
  body: (a: number) =>
    Effect.sync(() => {
      expect(a).toStrictEqual({ foo: 2 })
    })
})

it.effect("should work", () =>
  Effect.gen(function*() {
    const cause = yield* fn(0).pipe(
      Effect.sandbox,
      Effect.flip
    )
    const prettyErrors = Cause.prettyErrors(cause)
    expect(prettyErrors[0].stack ?? "").includes("at fn-0 ")
  }))
