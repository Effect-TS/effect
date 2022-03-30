import { Duration } from "../../../src/data/Duration"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"
import {
  acquire1,
  acquire2,
  makeLayer1,
  makeLayer2,
  makeRef,
  release1,
  release2
} from "./test-utils"

describe("Layer", () => {
  describe("orElse", () => {
    it("uses an alternative layer", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) =>
          ((layer1 >> Layer.fail("failed!")) | layer2).build()
        )
        .bind("fiber", ({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([acquire1, release1, acquire2, release2])
    })
  })

  describe("error handling", () => {
    it("handles errors gracefully", async () => {
      const sleep = Effect.sleep(Duration(100))
      const layer1 = Layer.fail("foo")
      const layer2 = Layer.succeed({ bar: "bar" })
      const layer3 = Layer.succeed({ baz: "baz" })
      const layer4 = Effect.scoped(Effect.acquireRelease(sleep, () => sleep))
        .toLayerRaw()
        .map((b) => ({ b }))

      const program = Effect.unit
        .provideLayer(layer1 + (layer2 + layer3 > layer4))
        .exit()

      const result = await program.unsafeRunPromise()

      expect(result.isFailure()).toBe(true)
    })
  })
})
