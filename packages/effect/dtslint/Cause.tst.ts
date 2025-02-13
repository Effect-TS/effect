import type { Predicate } from "effect"
import { Cause, hole, pipe } from "effect"
import { describe, expect, it } from "tstyche"

declare const err1: Cause.Cause<"err-1">
declare const err2: Cause.Cause<"err-2">

describe("Cause", () => {
  describe("andThen", () => {
    it("data first", () => {
      expect(Cause.andThen(err1, err2)).type.toBe<Cause.Cause<"err-2">>()
      expect(Cause.andThen(err1, () => err2)).type.toBe<Cause.Cause<"err-2">>()
    })

    it("data last", () => {
      expect(err1.pipe(Cause.andThen(err2))).type.toBe<Cause.Cause<"err-2">>()
      expect(err1.pipe(Cause.andThen(() => err2))).type.toBe<Cause.Cause<"err-2">>()
    })
  })

  it("filter", () => {
    expect(Cause.filter(err1, hole<Predicate.Predicate<Cause.Cause<string>>>())).type.toBe<Cause.Cause<"err-1">>()
    expect(pipe(err1, Cause.filter(hole<Predicate.Predicate<Cause.Cause<string>>>()))).type.toBe<Cause.Cause<"err-1">>()
  })
})
