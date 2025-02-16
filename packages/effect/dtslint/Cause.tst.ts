import type { Predicate } from "effect"
import { Cause, hole, pipe } from "effect"
import { describe, expect, it } from "tstyche"

declare const cause1: Cause.Cause<"err-1">
declare const cause2: Cause.Cause<"err-2">

describe("Cause", () => {
  it("andThen", () => {
    expect(Cause.andThen(cause1, cause2)).type.toBe<Cause.Cause<"err-2">>()
    expect(Cause.andThen(cause1, () => cause2)).type.toBe<Cause.Cause<"err-2">>()

    expect(cause1.pipe(Cause.andThen(cause2))).type.toBe<Cause.Cause<"err-2">>()
    expect(cause1.pipe(Cause.andThen(() => cause2))).type.toBe<Cause.Cause<"err-2">>()
  })

  it("filter", () => {
    const predicate = hole<Predicate.Predicate<Cause.Cause<string>>>()
    expect(Cause.filter(cause1, predicate)).type.toBe<Cause.Cause<"err-1">>()
    expect(pipe(cause1, Cause.filter(predicate))).type.toBe<Cause.Cause<"err-1">>()
  })
})
