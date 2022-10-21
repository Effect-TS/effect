import { mapper } from "@effect/core/test/stream/Channel/test-utils"

describe.concurrent("Channel", () => {
  describe.concurrent("reads", () => {
    it("simple reads", () =>
      Do(($) => {
        class Whatever implements Equals {
          constructor(readonly i: number) {}

          [Hash.sym](): number {
            return Hash.number(this.i)
          }

          [Equals.sym](u: unknown): boolean {
            return u instanceof Whatever && u.i === this.i
          }
        }
        const left = Channel.writeAll(1, 2, 3)
        const right = Channel.read<number>()
          .catchAll(() => Channel.succeed(4))
          .flatMap((i) => Channel.write(new Whatever(i)))
        const conduit = left.pipeTo(right.zipRight(right).zipRight(right).zipRight(right))
        const result = $(conduit.runCollect)
        const [chunk, _] = result
        const expected = Chunk(new Whatever(1), new Whatever(2), new Whatever(3), new Whatever(4))
        assert.isTrue(chunk == expected)
      }).unsafeRunPromise())

    it("pipeline", () =>
      Do(($) => {
        const channel = Channel.fromEffect(Ref.make(List.empty<number>())).flatMap((ref) => {
          function inner(): Channel<never, unknown, number, unknown, never, number, void> {
            return Channel.readWith(
              (i: number) =>
                Channel
                  .fromEffect(ref.update((list) => list.prepend(i)))
                  .zipRight(Channel.write(i))
                  .flatMap(inner),
              () => Channel.unit,
              () => Channel.unit
            )
          }
          return inner().zipRight(Channel.fromEffect(ref.get))
        })
        const f = (n: number) => n
        const g = (n: number) => List(n, n)
        const conduit = Channel.writeAll(1, 2)
          .pipeTo(mapper(f))
          .pipeTo(mapper(g).concatMap((ns) => Channel.writeAll(...ns)).unit)
          .pipeTo(channel)

        const result = $(conduit.runCollect)
        const [chunk, list] = result
        assert.isTrue(chunk == Chunk(1, 1, 2, 2))
        assert.isTrue(list == Chunk(2, 2, 1, 1))
      }).unsafeRunPromise())

    it("another pipeline", () =>
      Do(($) => {
        const ref = $(Ref.make(Chunk.empty<number>()))
        const intProducer: Channel<
          never,
          unknown,
          unknown,
          unknown,
          never,
          number,
          void
        > = Channel.writeAll(1, 2, 3, 4, 5)
        function readIntsN(
          n: number
        ): Channel<never, unknown, number, unknown, never, number, string> {
          return n > 0
            ? Channel.readWith(
              (i: number) => Channel.write(i).flatMap(() => readIntsN(n - 1)),
              () => Channel.succeed("EOF"),
              () => Channel.succeed("EOF")
            )
            : Channel.succeed("end")
        }
        function sum(
          label: string,
          acc: number
        ): Channel<never, unknown, number, unknown, unknown, never, void> {
          return Channel.readWith(
            (i: number) => sum(label, acc + i),
            () => Channel.fromEffect(ref.update((chunk) => chunk.append(acc))),
            () => Channel.fromEffect(ref.update((chunk) => chunk.append(acc)))
          )
        }
        const conduit = intProducer.pipeTo(
          readIntsN(2).pipeTo(sum("left", 0)).zipRight(readIntsN(2)).pipeTo(sum("right", 0))
        )
        const result = $(conduit.run.zipRight(ref.get))
        assert.isTrue(result == Chunk(3, 7))
      }).unsafeRunPromise())

    it("resources", () =>
      Do(($) => {
        const ref = $(Ref.make(Chunk.empty<string>()))
        const event = (label: string) => ref.update((chunk) => chunk.append(label))
        const left = Channel.acquireUseReleaseOut(
          event("Acquire outer"),
          () => event("Release outer")
        ).concatMap(
          () =>
            Channel.writeAll(1, 2, 3).concatMap((i) =>
              Channel.acquireUseReleaseOut(
                event(`Acquire ${i}`).as(i),
                () => event(`Release ${i}`)
              )
            )
        )
        const read = Channel.read<number>().mapEffect((i) => event(`Read ${i}`).unit)
        const right = read.zipRight(read).catchAll(() => Channel.unit)
        const conduit = left.pipeTo(right)
        const result = $(conduit.runDrain.zipRight(ref.get))
        const expected = Chunk(
          "Acquire outer",
          "Acquire 1",
          "Read 1",
          "Release 1",
          "Acquire 2",
          "Read 2",
          "Release 2",
          "Release outer"
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })
})
