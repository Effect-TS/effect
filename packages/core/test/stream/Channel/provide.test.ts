import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Effect } from "../../../src/io/Effect"
import { Channel } from "../../../src/stream/Channel"
import { NumberService } from "./test-utils"

describe("Channel", () => {
  describe("provide", () => {
    it("simple provide", async () => {
      const program = Channel.fromEffect(Effect.service(NumberService))
        .provideService(NumberService)({ n: 100 })
        .run()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual({ n: 100 })
    })

    it("provide.zip(provide)", async () => {
      const program = Channel.fromEffect(Effect.service(NumberService))
        .provideService(NumberService)({ n: 100 })
        .zip(
          Channel.fromEffect(Effect.service(NumberService)).provideService(
            NumberService
          )({ n: 200 })
        )
        .run()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Tuple({ n: 100 }, { n: 200 }))
    })

    it("concatMap(provide).provide", async () => {
      const program = Channel.fromEffect(Effect.service(NumberService))
        .emitCollect()
        .mapOut((tuple) => tuple.get(1))
        .concatMap((n) =>
          Channel.fromEffect(Effect.service(NumberService).map((m) => Tuple(n, m)))
            .provideService(NumberService)({ n: 200 })
            .flatMap((tuple) => Channel.write(tuple))
        )
        .provideService(NumberService)({ n: 100 })
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.get(0).toArray()).toEqual([Tuple({ n: 100 }, { n: 200 })])
      expect(result.get(1)).toBeUndefined()
    })

    it("provide is modular", async () => {
      const program = Channel.Do()
        .bind("v1", () => Channel.fromEffect(Effect.service(NumberService)))
        .bind("v2", () =>
          Channel.fromEffect(Effect.service(NumberService)).provideEnvironment(
            NumberService.has({ n: 2 })
          )
        )
        .bind("v3", () => Channel.fromEffect(Effect.service(NumberService)))
        .runDrain()
        .provideEnvironment(NumberService.has({ n: 4 }))

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual({ n: 4 })
      expect(v2).toEqual({ n: 2 })
      expect(v3).toEqual({ n: 4 })
    })
  })
})
