import { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision";
import { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy";
import { First, Second } from "@effect/core/test/stream/Channel/test-utils";
import { constVoid } from "@tsplus/stdlib/data/Function";

describe.concurrent("Channel", () => {
  describe.concurrent("concatMap", () => {
    it("plain", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .concatMap((i) => Channel.writeAll(i, i))
        .runCollect();

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise();

      assert.isTrue(chunk == Chunk(1, 1, 2, 2, 3, 3));
    });

    it("complex", async () => {
      const program = Channel.writeAll(1, 2)
        .concatMap((i) => Channel.writeAll(i, i))
        .mapOut((i) => new First(i))
        .concatMap((i) => Channel.writeAll(i, i))
        .mapOut((i) => new Second(i))
        .runCollect();

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise();

      assert.isTrue(
        chunk == Chunk(
          new Second(new First(1)),
          new Second(new First(1)),
          new Second(new First(1)),
          new Second(new First(1)),
          new Second(new First(2)),
          new Second(new First(2)),
          new Second(new First(2)),
          new Second(new First(2))
        )
      );
    });

    it("read from inner conduit", async () => {
      const source = Channel.writeAll(1, 2, 3, 4);
      const reader = Channel.read<number>().flatMap((n) => Channel.write(n));
      const readers = Channel.writeAll(undefined, undefined).concatMap(
        () => reader > reader
      );
      const program = (source >> readers).runCollect();

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise();

      assert.isTrue(chunk == Chunk(1, 2, 3, 4));
    });

    it("downstream failure", async () => {
      const program = Channel.write(0)
        .concatMap(() => Channel.fail("error"))
        .runCollect();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("error"));
    });

    it("upstream acquireReleaseOut + downstream failure", async () => {
      const program = Ref.make(Chunk.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((chunk) => chunk.append(label));

        const conduit = Channel.acquireUseReleaseOut(event("Acquired"), () => event("Released"))
          .concatMap(() => Channel.fail("error"))
          .runDrain()
          .exit();

        return conduit.zip(events.get());
      });

      const {
        tuple: [exit, events]
      } = await program.unsafeRunPromise();

      assert.isTrue(exit.untraced() == Exit.fail("error"));
      assert.isTrue(events == Chunk("Acquired", "Released"));
    });

    it("multiple concatMaps with failure in first", async () => {
      const program = Channel.write(undefined)
        .concatMap(() => Channel.write(Channel.fail("error")))
        .concatMap((e) => e)
        .runCollect();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("error"));
    });

    it("concatMap with failure then flatMap", async () => {
      const program = Channel.write(undefined)
        .concatMap(() => Channel.fail("error"))
        .flatMap(() => Channel.write(undefined))
        .runCollect();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("error"));
    });

    it("multiple concatMaps with failure in first and catchAll in second", async () => {
      const program = Channel.write(undefined)
        .concatMap(() => Channel.write(Channel.fail("error")))
        .concatMap((e) => e.catchAllCause(() => Channel.fail("error2")))
        .runCollect();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("error2"));
    });

    it("done value combination", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .as(List("Outer-0"))
        .concatMapWith(
          (i) => Channel.write(i).as(List(`Inner-${i}`)),
          (a: List<string>, b) => a + b,
          (a, b) => Tuple(a, b)
        )
        .runCollect();

      const {
        tuple: [
          chunk,
          {
            tuple: [list1, list2]
          }
        ]
      } = await program.unsafeRunPromise();

      assert.isTrue(chunk == Chunk(1, 2, 3));
      assert.isTrue(list1 == List("Inner-1", "Inner-2", "Inner-3"));
      assert.isTrue(list2 == List("Outer-0"));
    });

    it("custom 1", async () => {
      const program = Channel.writeAll(1, 2, 3, 4)
        .concatMapWithCustom(
          (x) =>
            Channel.writeAll(
              Option.some(Tuple(x, 1)),
              Option.none,
              Option.some(Tuple(x, 2)),
              Option.none,
              Option.some(Tuple(x, 3)),
              Option.none,
              Option.some(Tuple(x, 4))
            ),
          constVoid,
          constVoid,
          (pullRequest) => {
            switch (pullRequest._tag) {
              case "Pulled": {
                return UpstreamPullStrategy.PullAfterNext(Option.none);
              }
              case "NoUpstream": {
                return UpstreamPullStrategy.PullAfterAllEnqueued(Option.none);
              }
            }
          },
          (element) =>
            element.fold(
              ChildExecutorDecision.Yield,
              () => ChildExecutorDecision.Continue
            )
        )
        .runCollect()
        .map((tuple) => tuple.get(0).compact());

      const result = await program.unsafeRunPromise();

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
      );
    });

    it("custom 2", async () => {
      const program = Channel.writeAll(1, 2, 3, 4)
        .concatMapWithCustom(
          (x) =>
            Channel.writeAll(
              Option.some(Tuple(x, 1)),
              Option.none,
              Option.some(Tuple(x, 2)),
              Option.none,
              Option.some(Tuple(x, 3)),
              Option.none,
              Option.some(Tuple(x, 4))
            ),
          constVoid,
          constVoid,
          () => UpstreamPullStrategy.PullAfterAllEnqueued(Option.none),
          (element) =>
            element.fold(
              ChildExecutorDecision.Yield,
              () => ChildExecutorDecision.Continue
            )
        )
        .runCollect()
        .map((tuple) => tuple.get(0).compact());

      const result = await program.unsafeRunPromise();

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
      );
    });
  });
});
