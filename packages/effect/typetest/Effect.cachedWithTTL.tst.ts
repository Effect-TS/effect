/** @effect-diagnostics floatingEffect:skip-file */
import { Duration, Effect, Exit } from "effect"
import { describe, expect, it } from "tstyche"

declare const self: Effect.Effect<number, "error", "service">

describe("cachedWithTTL", () => {
  it("infers the callback exit and preserves the effect types in the data-first form", () => {
    const cached = Effect.cachedWithTTL(self, (exit) => {
      expect(exit).type.toBe<Exit.Exit<number, "error">>()
      return Exit.isSuccess(exit) ? Duration.seconds(exit.value) : 0
    })

    expect(cached).type.toBe<Effect.Effect<Effect.Effect<number, "error", "service">>>()
  })

  it("infers the callback exit and preserves the effect types in the piped form", () => {
    const cached = self.pipe(Effect.cachedWithTTL((exit) => {
      expect(exit).type.toBe<Exit.Exit<number, "error">>()
      return Exit.isSuccess(exit) ? "1 second" : 0
    }))

    expect(cached).type.toBe<Effect.Effect<Effect.Effect<number, "error", "service">>>()
  })

  it("preserves fixed Duration.Input overloads", () => {
    expect(Effect.cachedWithTTL(self, "1 second"))
      .type.toBe<Effect.Effect<Effect.Effect<number, "error", "service">>>()
    expect(self.pipe(Effect.cachedWithTTL(Duration.seconds(1))))
      .type.toBe<Effect.Effect<Effect.Effect<number, "error", "service">>>()
    expect(self.pipe(Effect.cachedWithTTL(1000)))
      .type.toBe<Effect.Effect<Effect.Effect<number, "error", "service">>>()
  })
})
