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
  describe("interruption", () => {
    it("with and (+)", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
        .bind("fiber", ({ env }) => Effect.scoped(env).fork())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      if (result.includes(acquire1)) {
        expect(result).toContain(release1)
      }
      if (result.includes(acquire2)) {
        expect(result).toContain(release2)
      }
    })

    it("with to (>)", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 >> layer2).build())
        .bind("fiber", ({ env }) => Effect.scoped(env).fork())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      if (result.includes(acquire1)) {
        expect(result).toContain(release1)
      }
      if (result.includes(acquire2)) {
        expect(result).toContain(release2)
      }
    })

    it("with multiple layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue("env", ({ layer1, layer2, layer3 }) =>
          (layer1 >> (layer2 + (layer1 >> layer3))).build()
        )
        .bind("fiber", ({ env }) => Effect.scoped(env).fork())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      if (result.includes(acquire1)) {
        expect(result).toContain(release1)
      }
      if (result.includes(acquire2)) {
        expect(result).toContain(release2)
      }
      if (result.includes(acquire3)) {
        expect(result).toContain(release3)
      }
    })
  })
})
