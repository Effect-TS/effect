/** @effect-diagnostics floatingEffect:skip-file missingEffectError:skip-file */
import { Effect } from "effect"
import { describe, expect, it } from "tstyche"

declare const source: Effect.Effect<number, "source-error", "source-service">
declare const observer: Effect.Effect<boolean, "observer-error", "observer-service">

describe("tapDefect saved observer", () => {
  it("saved observer preserves success-only never", () => {
    const observe = Effect.tapDefect(() => Effect.void)
    const result = observe(Effect.succeed(1))
    expect(result).type.toBe<Effect.Effect<number>>()
    const precise: Effect.Effect<number> = result
    void precise
    // @ts-expect-error Effect<number, never, never>
    const displayed: never = result
    void displayed
  })

  it("saved observer preserves each source error", () => {
    const observe = Effect.tapDefect(() => Effect.void)
    const first = observe(Effect.fail("failed"))
    const second = observe(Effect.fail(123))
    expect(first).type.toBe<Effect.Effect<never, string>>()
    expect(second).type.toBe<Effect.Effect<never, number>>()
    const precise: Effect.Effect<never, string> = first
    void precise
    // @ts-expect-error Effect<never, string, never>
    const displayed: never = first
    void displayed
  })

  it("saved observer preserves both error and service channels", () => {
    const observe = Effect.tapDefect((defect) => {
      expect(defect).type.toBe<unknown>()
      return observer
    })
    const result = observe(source)
    expect(result).type.toBe<
      Effect.Effect<number, "source-error" | "observer-error", "source-service" | "observer-service">
    >()
    expect(observe(Effect.succeed("ok"))).type.toBe<Effect.Effect<string, "observer-error", "observer-service">>()
    // @ts-expect-error Effect<number, "source-error" | "observer-error", "source-service" | "observer-service">
    const displayed: never = result
    void displayed
  })

  it("control data-first and inline pipe retain precise channels", () => {
    expect(Effect.tapDefect(source, () => observer)).type.toBe<
      Effect.Effect<number, "source-error" | "observer-error", "source-service" | "observer-service">
    >()
    expect(source.pipe(Effect.tapDefect(() => observer))).type.toBe<
      Effect.Effect<number, "source-error" | "observer-error", "source-service" | "observer-service">
    >()
    expect(Effect.tapDefect(Effect.succeed(1), () => Effect.void)).type.toBe<Effect.Effect<number>>()
    expect(Effect.fail("failed").pipe(Effect.tapDefect(() => Effect.void))).type.toBe<Effect.Effect<never, string>>()
  })

  it("control four explicit old generics retain their constrained source error", () => {
    const observe = Effect.tapDefect<"source-error", boolean, "observer-error", "observer-service">(() => observer)
    expect(observe(source)).type.toBe<
      Effect.Effect<number, "source-error" | "observer-error", "source-service" | "observer-service">
    >()
    expect(observe(Effect.succeed(1))).type.toBe<
      Effect.Effect<number, "source-error" | "observer-error", "observer-service">
    >()
    // @ts-expect-error Argument of type 'Effect<never, number, never>'
    observe(Effect.fail(123))
    const noErrors = Effect.tapDefect<never, void, never, never>(() => Effect.void)
    expect(noErrors(Effect.succeed(1))).type.toBe<Effect.Effect<number>>()
  })

  it("control explicit data-first generics remain valid", () => {
    const result = Effect.tapDefect<
      number,
      "source-error",
      "source-service",
      boolean,
      "observer-error",
      "observer-service"
    >(
      source,
      () => observer
    )
    expect(result).type.toBe<
      Effect.Effect<number, "source-error" | "observer-error", "source-service" | "observer-service">
    >()
  })
})
