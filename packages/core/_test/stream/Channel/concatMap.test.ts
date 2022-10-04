import { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"
import { First, Second } from "@effect/core/test/stream/Channel/test-utils"
import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Channel", () => {
  describe.concurrent("concatMap", () => {
    it("plain", () =>
      Do(($) => {
        const result = $(
          Channel.writeAll(1, 2, 3)
            .concatMap((i) => Channel.writeAll(i, i))
            .runCollect
        )
        assert.isTrue(result[0] == Chunk(1, 1, 2, 2, 3, 3))
      }).unsafeRunPromise())

    it("complex", () =>
      Do(($) => {
        const result = $(
          Channel.writeAll(1, 2)
            .concatMap((i) => Channel.writeAll(i, i))
            .mapOut((i) => new First(i))
            .concatMap((i) => Channel.writeAll(i, i))
            .mapOut((i) => new Second(i))
            .runCollect
        )
        assert.isTrue(
          result[0] == Chunk(
            new Second(new First(1)),
            new Second(new First(1)),
            new Second(new First(1)),
            new Second(new First(1)),
            new Second(new First(2)),
            new Second(new First(2)),
            new Second(new First(2)),
            new Second(new First(2))
          )
        )
      }).unsafeRunPromise())

    it("read from inner conduit", () =>
      Do(($) => {
        const source = Channel.writeAll(1, 2, 3, 4)
        const reader = Channel.read<number>().flatMap((n) => Channel.write(n))
        const readers = Channel.writeAll(undefined, undefined).concatMap(
          () => reader.flatMap(() => reader)
        )
        const result = $((source >> readers).runCollect)
        assert.isTrue(result[0] == Chunk(1, 2, 3, 4))
      }).unsafeRunPromise())

    it("downstream failure", () =>
      Do(($) => {
        const result = $(
          Channel.write(0)
            .concatMap(() => Channel.failSync("error"))
            .runCollect
            .exit
        )
        assert.isTrue(result == Exit.fail("error"))
      }).unsafeRunPromiseExit())

    it("upstream acquireReleaseOut + downstream failure", () =>
      Do(($) => {
        const result = $(
          Ref.make(Chunk.empty<string>()).flatMap((events) => {
            const event = (label: string) => events.update((chunk) => chunk.append(label))
            const conduit = Channel.acquireUseReleaseOut(event("Acquired"), () => event("Released"))
              .concatMap(() => Channel.failSync("error"))
              .runDrain
              .exit
            return conduit.zip(events.get)
          })
        )
        const [exit, events] = result
        assert.isTrue(exit == Exit.fail("error"))
        assert.isTrue(events == Chunk("Acquired", "Released"))
      }).unsafeRunPromiseExit())

    it("multiple concatMaps with failure in first", () =>
      Do(($) => {
        const result = $(
          Channel.write(undefined)
            .concatMap(() => Channel.write(Channel.failSync("error")))
            .concatMap((e) => e)
            .runCollect
            .exit
        )
        assert.isTrue(result == Exit.fail("error"))
      }).unsafeRunPromiseExit())

    it("concatMap with failure then flatMap", () =>
      Do(($) => {
        const result = $(
          Channel.write(undefined)
            .concatMap(() => Channel.failSync("error"))
            .flatMap(() => Channel.write(undefined))
            .runCollect
            .exit
        )
        assert.isTrue(result == Exit.fail("error"))
      }).unsafeRunPromiseExit())

    it("multiple concatMaps with failure in first and catchAll in second", () =>
      Do(($) => {
        const result = $(
          Channel.write(undefined)
            .concatMap(() => Channel.write(Channel.failSync("error")))
            .concatMap((e) => e.catchAllCause(() => Channel.failSync("error2")))
            .runCollect
            .exit
        )
        assert.isTrue(result == Exit.fail("error2"))
      }).unsafeRunPromiseExit())

    it("done value combination", () =>
      Do(($) => {
        const result = $(
          Channel.writeAll(1, 2, 3)
            .as(List("Outer-0"))
            .concatMapWith(
              (i) => Channel.write(i).as(List(`Inner-${i}`)),
              (a: List<string>, b) => a + b,
              (a, b) => Tuple(a, b)
            )
            .runCollect
        )
        const [chunk, [list1, list2]] = result
        assert.isTrue(chunk == Chunk(1, 2, 3))
        assert.isTrue(list1 == List("Inner-1", "Inner-2", "Inner-3"))
        assert.isTrue(list2 == List("Outer-0"))
      }).unsafeRunPromise())

    it("custom 1", () =>
      Do(($) => {
        const result = $(
          Channel.writeAll(1, 2, 3, 4)
            .concatMapWithCustom(
              (x) =>
                Channel.writeAll(
                  Maybe.some(Tuple(x, 1)),
                  Maybe.none,
                  Maybe.some(Tuple(x, 2)),
                  Maybe.none,
                  Maybe.some(Tuple(x, 3)),
                  Maybe.none,
                  Maybe.some(Tuple(x, 4))
                ),
              constVoid,
              constVoid,
              (pullRequest) => {
                switch (pullRequest._tag) {
                  case "Pulled": {
                    return UpstreamPullStrategy.PullAfterNext(Maybe.none)
                  }
                  case "NoUpstream": {
                    return UpstreamPullStrategy.PullAfterAllEnqueued(Maybe.none)
                  }
                }
              },
              (element) =>
                element.fold(
                  ChildExecutorDecision.Yield,
                  () => ChildExecutorDecision.Continue
                )
            )
            .runCollect
            .map((tuple) => tuple[0].compact)
        )
        assert.isTrue(
          result == Chunk(
            Tuple(1, 1),
            Tuple(2, 1),
            Tuple(3, 1),
            Tuple(4, 1),
            Tuple(1, 2),
            Tuple(2, 2),
            Tuple(3, 2),
            Tuple(4, 2),
            Tuple(1, 3),
            Tuple(2, 3),
            Tuple(3, 3),
            Tuple(4, 3),
            Tuple(1, 4),
            Tuple(2, 4),
            Tuple(3, 4),
            Tuple(4, 4)
          )
        )
      }).unsafeRunPromise())

    it("custom 2", () =>
      Do(($) => {
        const result = $(
          Channel.writeAll(1, 2, 3, 4)
            .concatMapWithCustom(
              (x) =>
                Channel.writeAll(
                  Maybe.some(Tuple(x, 1)),
                  Maybe.none,
                  Maybe.some(Tuple(x, 2)),
                  Maybe.none,
                  Maybe.some(Tuple(x, 3)),
                  Maybe.none,
                  Maybe.some(Tuple(x, 4))
                ),
              constVoid,
              constVoid,
              () => UpstreamPullStrategy.PullAfterAllEnqueued(Maybe.none),
              (element) =>
                element.fold(
                  ChildExecutorDecision.Yield,
                  () => ChildExecutorDecision.Continue
                )
            )
            .runCollect
            .map((tuple) => tuple[0].compact)
        )
        assert.isTrue(
          result == Chunk(
            Tuple(1, 1),
            Tuple(2, 1),
            Tuple(1, 2),
            Tuple(3, 1),
            Tuple(2, 2),
            Tuple(1, 3),
            Tuple(4, 1),
            Tuple(3, 2),
            Tuple(2, 3),
            Tuple(1, 4),
            Tuple(4, 2),
            Tuple(3, 3),
            Tuple(2, 4),
            Tuple(4, 3),
            Tuple(3, 4),
            Tuple(4, 4)
          )
        )
      }).unsafeRunPromise())
  })
})
