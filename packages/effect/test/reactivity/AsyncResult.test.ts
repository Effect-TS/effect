import { describe, expect, it } from "@effect/vitest"
import { Cause, Option } from "effect"
import { AsyncResult } from "effect/unstable/reactivity"

describe("AsyncResult", () => {
  describe("dual APIs", () => {
    it("waiting supports both call styles without options", () => {
      const dataFirst = AsyncResult.waiting(AsyncResult.success(1))
      const dataLast = AsyncResult.waiting()(AsyncResult.success(2))

      expect(dataFirst.waiting).toBe(true)
      expect(dataLast.waiting).toBe(true)
    })

    it("waiting supports both call styles with options", () => {
      const dataFirst = AsyncResult.waiting(AsyncResult.success(1), { touch: false })
      const dataLast = AsyncResult.waiting({ touch: false })(AsyncResult.success(2))

      expect(dataFirst.waiting).toBe(true)
      expect(dataLast.waiting).toBe(true)
    })

    it("replacePrevious supports data-first and data-last calls", () => {
      const previous = Option.some(AsyncResult.success(1))
      const dataFirst = AsyncResult.replacePrevious(AsyncResult.fail("data-first"), previous)
      const dataLast = AsyncResult.replacePrevious(previous)(AsyncResult.fail("data-last"))

      expect(Option.map(dataFirst.previousSuccess, (success) => success.value)).toEqual(Option.some(1))
      expect(Option.map(dataLast.previousSuccess, (success) => success.value)).toEqual(Option.some(1))
    })
  })

  describe("builder", () => {
    it("onDefect handles defects", () => {
      const defect = new Error("boom")
      const result = AsyncResult.failure<number, string>(Cause.die(defect))

      const handled = AsyncResult.builder(result)
        .onDefect((received) => received)
        .orElse(() => null)

      expect(handled).toBe(defect)
    })

    it("onDefect does not handle typed errors", () => {
      const handled = AsyncResult.builder(AsyncResult.fail("error"))
        .onDefect(() => "defect")
        .orElse(() => "fallback")

      expect(handled).toEqual("fallback")
    })

    it("exhaustive returns output when typed errors are handled", () => {
      const handled = AsyncResult.builder(
        AsyncResult.fail<{ readonly _tag: "NotFoundError"; readonly resource: string }>({
          _tag: "NotFoundError",
          resource: "user"
        })
      )
        .onErrorTag("NotFoundError", (error) => `missing:${error.resource}`)
        .onDefect(() => "failure")
        .onInterrupt(() => "interrupt")
        .exhaustive()

      expect(handled).toEqual("missing:user")
    })
  })
})
