import { Effect } from "../src/Effect"
import { tag } from "../src/Has"

interface EnvA {
  readonly a: number
}
const EnvA = tag<EnvA>(Symbol.for("effect-ts/system/test/fluent/env-a"))
const LiveEnvA = Effect.succeed(EnvA.has({ a: 1 })).toLayerRaw()

interface EnvB {
  readonly b: number
}
const EnvB = tag<EnvB>(Symbol.for("effect-ts/system/test/fluent/env-b"))
const LiveEnvB = Effect.succeed(EnvB.has({ b: 2 })).toLayerRaw()

interface EnvC {
  readonly c: number
}
const EnvC = tag<EnvC>(Symbol.for("effect-ts/system/test/fluent/env-c"))
const LiveEnvC = Effect.do
  .bind("a", () => Effect.service(EnvA))
  .bind("b", () => Effect.service(EnvB))
  .map(({ a, b }) => EnvC.has({ c: a.a + b.b }))
  .toLayerRaw()

describe("Effect Fluent API", () => {
  it("should succeed in using the fluent api", async () => {
    const result = await Effect.succeed(0)
      .map((n) => n + 1)
      .unsafeRunPromise()

    expect(result).toEqual(1)
  })
  it("should access and provide", async () => {
    const program = Effect.do
      .bind("envA", () => Effect.service(EnvA))
      .bind("envB", () => Effect.service(EnvB))
      .bind("envC", () => Effect.service(EnvC))
      .orElse(Effect.die("hello"))

    const {
      envA: { a },
      envB: { b },
      envC: { c }
    } = await program
      .provideSomeLayer(LiveEnvA + LiveEnvB > LiveEnvC)
      .unsafeRunPromise()

    expect(a).toEqual(1)
    expect(b).toEqual(2)
    expect(c).toEqual(3)
  })
})
