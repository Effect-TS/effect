import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Managed } from "../../../src/io/Managed"
import { Ref } from "../../../src/io/Ref"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("runHead", () => {
    it("nonempty stream", async () => {
      const program = Stream(1, 2, 3, 4).runHead()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })

    it("empty stream", async () => {
      const program = Stream.empty.runHead()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("pulls up to the first non-empty chunk", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("head", ({ ref }) =>
          Stream(
            Stream.fromEffect(ref.update((list) => list.prepend(1))).drain(),
            Stream.fromEffect(ref.update((list) => list.prepend(2))).drain(),
            Stream(1),
            Stream.fromEffect(ref.update((list) => list.prepend(3)))
          )
            .flatten()
            .runHead()
        )
        .bind("result", ({ ref }) => ref.get())

      const { head, result } = await program.unsafeRunPromise()

      expect(head).toEqual(Option.some(1))
      expect(result.toArray()).toEqual([2, 1])
    })
  })

  describe("runLast", () => {
    it("nonempty stream", async () => {
      const program = Stream(1, 2, 3, 4).runLast()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(4))
    })

    it("empty stream", async () => {
      const program = Stream.empty.runLast()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("runManaged", () => {
    it("properly closes the resources", async () => {
      const program = Effect.Do()
        .bind("closed", () => Ref.make(false))
        .bindValue("res", ({ closed }) =>
          Managed.acquireReleaseWith(Effect.succeed(1), () => closed.set(true))
        )
        .bindValue("stream", ({ res }) =>
          Stream.managed(res).flatMap((a) => Stream(a, a, a))
        )
        .bind("collectAndCheck", ({ closed, stream }) =>
          stream
            .runManaged(Sink.collectAll())
            .flatMap((r) =>
              closed
                .get()
                .toManaged()
                .map((b) => Tuple(r, b))
            )
            .useNow()
        )
        .bind("finalState", ({ closed }) => closed.get())

      const { collectAndCheck, finalState } = await program.unsafeRunPromise()

      expect(collectAndCheck.get(0).toArray()).toEqual([1, 1, 1])
      expect(collectAndCheck.get(1)).toBe(false)
      expect(finalState).toBe(true)
    })
  })
})
