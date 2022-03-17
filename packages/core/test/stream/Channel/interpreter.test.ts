import { IllegalStateException, RuntimeError } from "packages/core/src/io/Cause"
import { MergeDecision } from "packages/core/src/stream/Channel/MergeDecision"

import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { constVoid } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Managed } from "../../../src/io/Managed"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Channel } from "../../../src/stream/Channel"
import { ChildExecutorDecision } from "../../../src/stream/Channel/ChildExecutorDecision"
import { UpstreamPullStrategy } from "../../../src/stream/Channel/UpstreamPullStrategy"

describe("Channel", () => {
  it("succeed", async () => {
    const program = Channel.succeed(1).runCollect()

    const {
      tuple: [chunk, z]
    } = await program.unsafeRunPromise()

    expect(chunk.isEmpty()).toBe(true)
    expect(z).toBe(1)
  })

  it("fail", async () => {
    const program = Channel.fail("uh oh").runCollect()

    const result = await program.unsafeRunPromiseExit()

    expect(result.untraced()).toEqual(Exit.fail("uh oh"))
  })

  it("map", async () => {
    const program = Channel.succeed(1)
      .map((n) => n + 1)
      .runCollect()

    const {
      tuple: [chunk, z]
    } = await program.unsafeRunPromise()

    expect(chunk.isEmpty()).toBe(true)
    expect(z).toBe(2)
  })

  describe("flatMap", () => {
    it("simple", async () => {
      const program = Channel.Do()
        .bind("x", () => Channel.succeed(1))
        .bind("y", ({ x }) => Channel.succeed(x * 2))
        .bind("z", ({ x, y }) => Channel.succeed(x + y))
        .map(({ x, y, z }) => x + y + z)
        .runCollect()

      const {
        tuple: [chunk, z]
      } = await program.unsafeRunPromise()

      expect(chunk.isEmpty()).toBe(true)
      expect(z).toBe(6)
    })

    it("structure confusion", async () => {
      const program = Channel.write(Chunk(1, 2))
        .concatMap((chunk) => Channel.writeAll(chunk))
        .zipRight(Channel.fail("hello"))
        .runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("hello"))
    })
  })

  describe("catchAll", () => {
    it("structure confusion", async () => {
      const program = Channel.write(8)
        .catchAll(() => Channel.write(0).concatMap(() => Channel.fail("error1")))
        .concatMap(() => Channel.fail("error2"))
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error2"))
    })
  })

  describe("ensuring", () => {
    it("prompt closure between continuations", async () => {
      const program = Ref.make(List.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((list) => list.append(label))
        const channel =
          Channel.fromEffect(event("Acquire1"))
            .ensuring(event("Release11"))
            .ensuring(event("Release12")) >
          Channel.fromEffect(event("Acquire2")).ensuring(event("Release2"))
        return channel.runDrain() > events.get()
      })

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(
        List("Acquire1", "Release11", "Release12", "Acquire2", "Release2")
      )
    })

    it("last finalizers are deferred to the Managed", async () => {
      const program = Ref.make(List.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((list) => list.append(label))
        const channel = (
          Channel.fromEffect(event("Acquire1"))
            .ensuring(event("Release11"))
            .ensuring(event("Release12")) >
          Channel.fromEffect(event("Acquire2")).ensuring(event("Release2"))
        ).ensuring(event("ReleaseOuter"))

        return channel
          .toPull()
          .use((pull) => pull.exit() > events.get())
          .flatMap((eventsInManaged) =>
            events
              .get()
              .map((eventsAfterManaged) => Tuple(eventsInManaged, eventsAfterManaged))
          )
      })

      const {
        tuple: [before, after]
      } = await program.unsafeRunPromise()

      expect(before.toArray()).toEqual([
        "Acquire1",
        "Release11",
        "Release12",
        "Acquire2"
      ])
      expect(after.toArray()).toEqual([
        "Acquire1",
        "Release11",
        "Release12",
        "Acquire2",
        "Release2",
        "ReleaseOuter"
      ])
    })

    it("mixture of concatMap and ensuring", async () => {
      const program = Ref.make(List.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((list) => list.append(label))

        const conduit = Channel.writeAll(1, 2, 3)
          .ensuring(event("Inner"))
          .concatMap((i) => Channel.write({ first: i }).ensuring(event("First write")))
          .ensuring(event("First concatMap"))
          .concatMap((i) =>
            Channel.write({ second: i }).ensuring(event("Second write"))
          )
          .ensuring(event("Second concatMap"))

        return conduit.runCollect().zipFlatten(events.get())
      })

      const {
        tuple: [elements, _, events]
      } = await program.unsafeRunPromise()

      expect(events.toArray()).toEqual([
        "Second write",
        "First write",
        "Second write",
        "First write",
        "Second write",
        "First write",
        "Inner",
        "First concatMap",
        "Second concatMap"
      ])
      expect(elements.toArray()).toEqual([
        { second: { first: 1 } },
        { second: { first: 2 } },
        { second: { first: 3 } }
      ])
    })

    it("finalizer ordering 2", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .bindValue(
          "push",
          ({ effects }) =>
            (label: string) =>
              effects.update((list) => list.append(label))
        )
        .tap(({ push }) =>
          Channel.writeAll(1, 2)
            .mapOutEffect((n) => push(`pulled ${n}`).as(n))
            .concatMap((n) => Channel.write(n).ensuring(push(`close ${n}`)))
            .runDrain()
        )
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["pulled 1", "close 1", "pulled 2", "close 2"])
    })
  })

  describe("mapOut", () => {
    it("simple", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .mapOut((n) => n + 1)
        .runCollect()

      const {
        tuple: [chunk, z]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([2, 3, 4])
      expect(z).toBeUndefined()
    })

    it("mixed with flatMap", async () => {
      const program = Channel.write(1)
        .mapOut((n) => n.toString())
        .flatMap(() => Channel.write("x"))
        .runCollect()
        .map((tuple) => tuple.get(0).toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["1", "x"])
    })
  })

  describe("concatMap", () => {
    it("plain", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .concatMap((i) => Channel.writeAll(i, i))
        .runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([1, 1, 2, 2, 3, 3])
    })

    it("complex", async () => {
      const program = Channel.writeAll(1, 2)
        .concatMap((i) => Channel.writeAll(i, i))
        .mapOut((i) => ({ first: i }))
        .concatMap((i) => Channel.writeAll(i, i))
        .mapOut((n) => ({ second: n }))
        .runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([
        { second: { first: 1 } },
        { second: { first: 1 } },
        { second: { first: 1 } },
        { second: { first: 1 } },
        { second: { first: 2 } },
        { second: { first: 2 } },
        { second: { first: 2 } },
        { second: { first: 2 } }
      ])
    })

    it("read from inner conduit", async () => {
      const source = Channel.writeAll(1, 2, 3, 4)
      const reader = Channel.read<number>().flatMap((n) => Channel.write(n))
      const readers = Channel.writeAll(undefined, undefined).concatMap(
        () => reader > reader
      )
      const program = (source >> readers).runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([1, 2, 3, 4])
    })

    it("downstream failure", async () => {
      const program = Channel.write(0)
        .concatMap(() => Channel.fail("error"))
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })

    it("upstream acquireReleaseOut + downstream failure", async () => {
      const program = Ref.make(List.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((list) => list.append(label))

        const conduit = Channel.acquireReleaseOutWith(event("Acquired"), () =>
          event("Released")
        )
          .concatMap(() => Channel.fail("error"))
          .runDrain()
          .exit()

        return conduit.zip(events.get())
      })

      const {
        tuple: [exit, events]
      } = await program.unsafeRunPromise()

      expect(exit.untraced()).toEqual(Exit.fail("error"))
      expect(events.toArray()).toEqual(["Acquired", "Released"])
    })

    it("multiple concatMaps with failure in first", async () => {
      const program = Channel.write(undefined)
        .concatMap(() => Channel.write(Channel.fail("error")))
        .concatMap((e) => e)
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })

    it("concatMap with failure then flatMap", async () => {
      const program = Channel.write(undefined)
        .concatMap(() => Channel.fail("error"))
        .flatMap(() => Channel.write(undefined))
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })

    it("multiple concatMaps with failure in first and catchAll in second", async () => {
      const program = Channel.write(undefined)
        .concatMap(() => Channel.write(Channel.fail("error")))
        .concatMap((e) => e.catchAllCause(() => Channel.fail("error2")))
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error2"))
    })

    it("done value combination", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .as(List("Outer-0"))
        .concatMapWith(
          (i) => Channel.write(i).as(List(`Inner-${i}`)),
          (a, b) => a + b,
          (a, b) => Tuple(a, b)
        )
        .runCollect()

      const {
        tuple: [
          chunk,
          {
            tuple: [list1, list2]
          }
        ]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([1, 2, 3])
      expect(list1.toArray()).toEqual(["Inner-1", "Inner-2", "Inner-3"])
      expect(list2.toArray()).toEqual(["Outer-0"])
    })

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
                return UpstreamPullStrategy.PullAfterNext(Option.none)
              }
              case "NoUpstream": {
                return UpstreamPullStrategy.PullAfterAllEnqueued(Option.none)
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
        .map((tuple) => tuple.get(0).compact())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
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
      ])
    })

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
        .map((tuple) => tuple.get(0).compact())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
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
      ])
    })
  })

  describe("managedOut", () => {
    it("failure", async () => {
      const program = Channel.managedOut(Managed.fail("error")).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })
  })

  describe("mergeWith", () => {
    it("simple merge", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .mergeWith(
          Channel.writeAll(4, 5, 6),
          (exit) => MergeDecision.awaitConst(Effect.done(exit)),
          (exit) => MergeDecision.awaitConst(Effect.done(exit))
        )
        .runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([1, 2, 3, 4, 5, 6])
    })

    it("merge with different types", async () => {
      const left =
        Channel.write(1) >
        Channel.fromEffect(
          Effect.attempt("whatever").refineOrDie((e) =>
            e instanceof RuntimeError ? Option.some(e) : Option.none
          )
        )
      const right =
        Channel.write(2) >
        Channel.fromEffect(
          Effect.attempt(true).refineOrDie((e) =>
            e instanceof IllegalStateException ? Option.some(e) : Option.none
          )
        )
      const program = left
        .mergeWith(
          right,
          (exit) => MergeDecision.await((exit2) => Effect.done(exit.zip(exit2))),
          (exit2) => MergeDecision.await((exit) => Effect.done(exit.zip(exit2)))
        )
        .runCollect()

      const {
        tuple: [chunk, result]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([1, 2])
      expect(result.get(0)).toEqual("whatever")
      expect(result.get(1)).toEqual(true)
    })

    it("handles polymorphic failures", async () => {
      const left = Channel.write(1) > Channel.fail("boom").as(true)
      const right = Channel.write(2) > Channel.fail(true).as(true)
      const program = left
        .mergeWith(
          right,
          (exit) =>
            MergeDecision.await((exit2) =>
              Effect.done(exit).flip().zip(Effect.done(exit2).flip()).flip()
            ),
          (exit2) =>
            MergeDecision.await((exit) =>
              Effect.done(exit).flip().zip(Effect.done(exit2).flip()).flip()
            )
        )
        .runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Tuple("boom", true)))
    })

    it("interrupts losing side", async () => {
      const program = Promise.make<never, void>().flatMap((latch) =>
        Ref.make(false).flatMap((interrupted) => {
          const left =
            Channel.write(1) >
            Channel.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                interrupted.set(true)
              )
            )
          const right = Channel.write(2) > Channel.fromEffect(latch.await())
          const merged = left.mergeWith(
            right,
            (exit) => MergeDecision.done(Effect.done(exit)),
            () =>
              MergeDecision.done(
                interrupted
                  .get()
                  .flatMap((b) => (b ? Effect.unit : Effect.fail(undefined)))
              )
          )
          return merged.runDrain()
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isSuccess()).toBe(true)
    })
  })
})
