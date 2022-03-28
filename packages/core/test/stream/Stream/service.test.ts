import { Chunk } from "../../../src/collection/immutable/Chunk"
import { tag } from "../../../src/data/Has"
import type { UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("serviceWith", () => {
    it("serviceWithEffect", async () => {
      interface A {
        readonly live: UIO<number>
      }

      const A = tag<A>()

      const program = Stream.serviceWithEffect(A)((_) => _.live)
        .provideSomeLayer(Layer.succeed(A.has({ live: Effect.succeed(10) })))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([10])
    })

    it("serviceWithStream", async () => {
      interface A {
        readonly live: Stream<unknown, never, number>
      }

      const A = tag<A>()

      const program = Stream.serviceWithStream(A)((_) => _.live)
        .provideSomeLayer(
          Layer.succeed(A.has({ live: Stream.fromIterable(Chunk.range(0, 10)) }))
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(Chunk.range(0, 10).toArray())
    })
  })
})
