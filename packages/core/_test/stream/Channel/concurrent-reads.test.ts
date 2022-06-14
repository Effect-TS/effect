import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"
import { mapper, refReader, refWriter } from "@effect/core/test/stream/Channel/test-utils"

describe.concurrent("Channel", () => {
  describe.concurrent("concurrent reads", () => {
    it("simple concurrent reads", async () => {
      const capacity = 128

      const program = Effect.collectAll(Chunk.fill(capacity, () => Random.nextInt)).flatMap(
        (data) =>
          Ref.make(List.from(data))
            .zip(Ref.make(List.empty<number>()))
            .flatMap(({ tuple: [source, dest] }) => {
              const twoWriters = refWriter(dest).mergeWith(
                refWriter(dest),
                () => MergeDecision.awaitConst(Effect.unit),
                () => MergeDecision.awaitConst(Effect.unit)
              )

              return (refReader(source) >> twoWriters)
                .mapEffect(() => dest.get())
                .run
                .map((result) => {
                  let missing = HashSet.from(data)
                  let surplus = HashSet.from(result)

                  for (const value of result) {
                    missing = missing.remove(value)
                  }
                  for (const value of data) {
                    surplus = surplus.remove(value)
                  }

                  return Tuple(missing, surplus)
                })
            })
      )

      const {
        tuple: [missing, surplus]
      } = await program.unsafeRunPromise()

      assert.strictEqual(missing.size, 0)
      assert.strictEqual(surplus.size, 0)
    })

    it("nested concurrent reads", async () => {
      const capacity = 128
      const f = (n: number) => n + 1

      const program = Effect.collectAll(Chunk.fill(capacity, () => Random.nextInt)).flatMap(
        (data) =>
          Ref.make(List.from(data))
            .zip(Ref.make(List.empty<number>()))
            .flatMap(({ tuple: [source, dest] }) => {
              const twoWriters = (mapper(f) >> refWriter(dest)).mergeWith(
                mapper(f) >> refWriter(dest),
                () => MergeDecision.awaitConst(Effect.unit),
                () => MergeDecision.awaitConst(Effect.unit)
              )

              return (refReader(source) >> twoWriters)
                .mapEffect(() => dest.get())
                .run
                .map((result) => {
                  const expected = HashSet.from(data.map(f))
                  let missing = HashSet.from(expected)
                  let surplus = HashSet.from(result)

                  for (const value of result) {
                    missing = missing.remove(value)
                  }
                  for (const value of expected) {
                    surplus = surplus.remove(value)
                  }

                  return Tuple(missing, surplus)
                })
            })
      )

      const {
        tuple: [missing, surplus]
      } = await program.unsafeRunPromise()

      assert.strictEqual(missing.size, 0)
      assert.strictEqual(surplus.size, 0)
    })
  })
})
