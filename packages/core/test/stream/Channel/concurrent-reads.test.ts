import { HashSet } from "../../../src/collection/immutable/HashSet"
import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Effect } from "../../../src/io/Effect"
import { Random } from "../../../src/io/Random"
import { Ref } from "../../../src/io/Ref"
import { MergeDecision } from "../../../src/stream/Channel/MergeDecision"
import { mapper, refReader, refWriter } from "./test-utils"

describe("Channel", () => {
  describe("concurrent reads", () => {
    it("simple concurrent reads", async () => {
      const capacity = 128

      const program = Effect.collectAll(List.repeat(Random.nextInt, capacity)).flatMap(
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
                .mapEffect(() => dest.get)
                .run()
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

      expect(missing.size).toBe(0)
      expect(surplus.size).toBe(0)
    })

    it("nested concurrent reads", async () => {
      const capacity = 128
      const f = (n: number) => n + 1

      const program = Effect.collectAll(List.repeat(Random.nextInt, capacity)).flatMap(
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
                .mapEffect(() => dest.get)
                .run()
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

      expect(missing.size).toBe(0)
      expect(surplus.size).toBe(0)
    })
  })
})
