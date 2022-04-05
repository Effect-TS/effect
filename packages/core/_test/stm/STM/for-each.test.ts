import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"

describe("STM", () => {
  describe("forEach", () => {
    it("performs an action on each list element and return a single transaction that contains the result", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) => STM.forEach(list, (n) => tRef.update((_) => _ + n)).commit())
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(list.reduce(0, (acc, n) => acc + n))
    })

    it("performs an action on each chunk element and return a single transaction that contains the result", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) =>
          STM.forEach(chunk, (n) => tRef.update((_) => _ + n)).commit()
        )
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(chunk.reduce(0, (acc, n) => acc + n))
    })
  })

  describe("forEachDiscard", () => {
    it("performs actions in order given a list", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(List.empty<number>()))
        .tap(({ tRef }) =>
          STM.forEach(list, (n) => tRef.update((list) => list.append(n))).commit()
        )
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })

    it("performs actions in order given a chunk", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(List.empty<number>()))
        .tap(({ tRef }) =>
          STM.forEach(chunk, (n) => tRef.update((list) => list.append(n))).commit()
        )
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })
  })
})
