import { Effect } from "../../../src/io/Effect"
import {
  acquire1,
  acquire2,
  acquire3,
  makeLayer1,
  makeLayer2,
  makeLayer3,
  makeRef,
  release1,
  release2,
  release3
} from "./test-utils"

describe("Layer", () => {
  describe("to (>)", () => {
    it("sharing", async () => {
      const expected = [acquire1, release1]

      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer", ({ ref }) => makeLayer1(ref))
        .bindValue("env", ({ layer }) => (layer >> layer).build())
        .tap(({ env }) => Effect.scoped(env))
        .bind("actual", ({ ref }) => ref.get)

      const { actual } = await program.unsafeRunPromise()

      expect(actual.toArray()).toEqual(expected)
    })

    it("sharing with multiple layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue("env", ({ layer1, layer2, layer3 }) =>
          ((layer1 >> layer2) + (layer1 >> layer3)).build()
        )
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result[0]).toBe(acquire1)
      expect(result.slice(1, 3)).toContain(acquire2)
      expect(result.slice(1, 3)).toContain(acquire3)
      expect(result.slice(3, 5)).toContain(release2)
      expect(result.slice(3, 5)).toContain(release3)
      expect(result[5]).toBe(release1)
    })

    it("finalizers with to", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 >> layer2).build())
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([acquire1, acquire2, release2, release1])
    })

    it("finalizers with multiple layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue("env", ({ layer1, layer2, layer3 }) =>
          ((layer1 >> layer2) >> layer3).build()
        )
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([
        acquire1,
        acquire2,
        acquire3,
        release3,
        release2,
        release1
      ])
    })
  })
})
