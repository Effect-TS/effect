import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Duration } from "../../../src/data/Duration"
import { constFalse, constTrue } from "../../../src/data/Function"
import { tag } from "../../../src/data/Has"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"

describe("Layer", () => {
  describe("acquisition", () => {
    it("layers can be acquired in parallel", async () => {
      const test = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bindValue("layer1", () => Layer.fromRawEffect(Effect.never))
        .bindValue("layer2", ({ promise }) =>
          Layer.fromRawEffect(
            Effect.acquireRelease(promise.succeed(undefined), () => Effect.unit)
          ).map((a) => ({ a }))
        )
        .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
        .bind("fiber", ({ env }) => Effect.scoped(env).forkDaemon())
        .tap(({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .map(constTrue)

      // Given the use of `Managed.never`, race the test against a 10 second
      // timer and fail the test if the computation doesn't complete. This delay
      // time may be increased if it turns out this test is flaky.
      const program = Effect.sleep(Duration.fromSeconds(10))
        .zipRight(Effect.succeed(constFalse))
        .race(test)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("preserves identity of acquired resources", async () => {
      const ChunkServiceId = Symbol()
      const ChunkService = tag<Ref<Chunk<string>>>(ChunkServiceId)

      const program = Effect.Do()
        .bind("testRef", () => Ref.make(Chunk.empty<string>()))
        .bindValue("layer", ({ testRef }) =>
          Layer.scoped(ChunkService)(
            Effect.acquireRelease(Ref.make(Chunk.empty<string>()), (ref) =>
              ref.get.flatMap((_) => testRef.set(_))
            ).tap(() => Effect.unit)
          )
        )
        .tap(({ layer }) =>
          Effect.scoped(
            layer
              .build()
              .flatMap((_) => ChunkService.read(_).update((_) => _.append("test")))
          )
        )
        .flatMap(({ testRef }) => testRef.get)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["test"])
    })
  })
})
