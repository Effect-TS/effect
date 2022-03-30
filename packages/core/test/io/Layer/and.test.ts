import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"
import {
  acquire1,
  acquire2,
  HasService1,
  makeLayer1,
  makeLayer2,
  makeRef,
  release1,
  release2,
  Service1
} from "./test-utils"

describe("Layer", () => {
  describe("and (+)", () => {
    it("sharing with and", async () => {
      const expected = [acquire1, release1]

      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer", ({ ref }) => makeLayer1(ref))
        .bindValue("env", ({ layer }) => (layer + layer).build())
        .tap(({ env }) => Effect.scoped(env))
        .bind("actual", ({ ref }) => ref.get)

      const { actual } = await program.unsafeRunPromise()

      expect(actual.toArray()).toEqual(expected)
    })

    it("sharing itself with and", async () => {
      const program = Effect.scoped(
        Effect.Do()
          .bindValue("m", () => new Service1())
          .bindValue("layer", ({ m }) => Layer.fromValue(HasService1)(m))
          .bindValue("env", ({ layer }) => (layer + layer + layer).build())
          .bind("m1", ({ env }) =>
            env.flatMap((m) => Effect.attempt(HasService1.read(m)))
          )
      )

      const { m, m1 } = await program.unsafeRunPromise()

      expect(m).toStrictEqual(m1)
    })

    it("finalizers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result.slice(0, 2)).toContain(acquire1)
      expect(result.slice(0, 2)).toContain(acquire2)
      expect(result.slice(2, 4)).toContain(release1)
      expect(result.slice(2, 4)).toContain(release2)
    })
  })
})
