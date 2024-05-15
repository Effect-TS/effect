/* eslint-disable require-yield */
import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

it.effect("should work", () =>
  Effect.gen(function*() {
    expect({ foo: 1 }).toBe({ foo: 2 })
  }))
