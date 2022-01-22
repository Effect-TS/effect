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

describe("Effect Fluent API", () => {
  it("should succeed in using the fluent api", async () => {
    const result = await Effect.succeed(0)
      .map((n) => n + 1)
      .unsafeRunPromise()

    expect(result).toEqual(1)
  })
  it("should access and provide", async () => {
    const {
      envA: { a },
      envB: { b }
    } = await Effect.do
      .bind("envA", () => Effect.service(EnvA))
      .bind("envB", () => Effect.service(EnvB))
      .provideSomeLayer(LiveEnvA)
      .provideSomeLayer(LiveEnvB)
      .unsafeRunPromise()

    expect(a).toEqual(1)
    expect(b).toEqual(2)
  })
})
