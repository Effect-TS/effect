import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Channel from "effect/Channel"
import * as ChildExecutorDecision from "effect/ChildExecutorDecision"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constVoid, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as UpstreamPullRequest from "effect/UpstreamPullRequest"
import * as UpstreamPullStrategy from "effect/UpstreamPullStrategy"

interface First {
  readonly _tag: "First"
  readonly n: number
}

const First = (n: number): First => ({ _tag: "First", n })

interface Second {
  readonly _tag: "Second"
  readonly first: First
}

const Second = (first: First): Second => ({ _tag: "Second", first })

describe("Channel", () => {
  it.effect("map", () =>
    Effect.gen(function*() {
      const [chunk, value] = yield* pipe(
        Channel.succeed(1),
        Channel.map((n) => n + 1),
        Channel.runCollect
      )
      assertTrue(Chunk.isEmpty(chunk))
      strictEqual(value, 2)
    }))

  it.effect("mapError - structure confusion", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.fail("error"),
        Channel.mapError(() => 1),
        Channel.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(1))
    }))

  it.effect("mapOut - simple", () =>
    Effect.gen(function*() {
      const [chunk, value] = yield* pipe(
        Channel.writeAll(1, 2, 3),
        Channel.mapOut((n) => n + 1),
        Channel.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(chunk), [2, 3, 4])
      strictEqual(value, undefined)
    }))

  it.effect("mapOut - mixed with flatMap", () =>
    Effect.gen(function*() {
      const [chunk, value] = yield* pipe(
        Channel.write(1),
        Channel.mapOut((n) => `${n}`),
        Channel.flatMap(() => Channel.write("x")),
        Channel.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(chunk), ["1", "x"])
      strictEqual(value, undefined)
    }))

  it.effect("concatMap - plain", () =>
    Effect.gen(function*() {
      const [result] = yield* pipe(
        Channel.writeAll(1, 2, 3),
        Channel.concatMap((i) => Channel.writeAll(i, i)),
        Channel.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(result), [1, 1, 2, 2, 3, 3])
    }))

  it.effect("concatMap - complex", () =>
    Effect.gen(function*() {
      const [result] = yield* pipe(
        Channel.writeAll(1, 2),
        Channel.concatMap((i) => Channel.writeAll(i, i)),
        Channel.mapOut(First),
        Channel.concatMap((i) => Channel.writeAll(i, i)),
        Channel.mapOut(Second),
        Channel.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(result), [
        Second(First(1)),
        Second(First(1)),
        Second(First(1)),
        Second(First(1)),
        Second(First(2)),
        Second(First(2)),
        Second(First(2)),
        Second(First(2))
      ])
    }))

  it.effect("concatMap - read from inner channel", () =>
    Effect.gen(function*() {
      const source = Channel.writeAll(1, 2, 3, 4)
      const reader = pipe(
        Channel.read<number>(),
        Channel.flatMap(Channel.write)
      )
      const readers = pipe(
        Channel.writeAll(void 0, void 0),
        Channel.concatMap(() => pipe(reader, Channel.flatMap(() => reader)))
      )
      const [result] = yield* pipe(
        source,
        Channel.pipeTo(readers),
        Channel.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(result), [1, 2, 3, 4])
    }))

  it.effect("concatMap - downstream failure", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.write(0),
        Channel.concatMap(() => Channel.fail("error")),
        Channel.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail("error"))
    }))

  it.effect("concatMap - upstream acquireReleaseOut + downstream failure", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<string>>([]))
      const event = (label: string) => Ref.update(ref, (array) => [...array, label])
      const effect = pipe(
        Channel.acquireReleaseOut(event("Acquired"), () => event("Released")),
        Channel.concatMap(() => Channel.fail("error")),
        Channel.runDrain,
        Effect.exit
      )
      const [exit, events] = yield* pipe(effect, Effect.zip(Ref.get(ref)))
      deepStrictEqual(exit, Exit.fail("error"))
      deepStrictEqual(events, ["Acquired", "Released"])
    }))

  it.effect("concatMap - multiple concatMaps with failure in first", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.write(void 0),
        Channel.concatMap(() => Channel.write(Channel.fail("error"))),
        Channel.concatMap((e) => e),
        Channel.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail("error"))
    }))

  it.effect("concatMap - with failure then flatMap", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.write(void 0),
        Channel.concatMap(() => Channel.fail("error")),
        Channel.flatMap(() => Channel.write(void 0)),
        Channel.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail("error"))
    }))

  it.effect("concatMap - multiple concatMaps with failure in first and catchAll in second", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.write(void 0),
        Channel.concatMap(() => Channel.write(Channel.fail("error"))),
        Channel.concatMap(Channel.catchAllCause(() => Channel.fail("error2"))),
        Channel.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail("error2"))
    }))

  it.effect("concatMap - done value combination", () =>
    Effect.gen(function*() {
      const [chunk, [array1, array2]] = yield* pipe(
        Channel.writeAll(1, 2, 3),
        Channel.as(["Outer-0"]),
        Channel.concatMapWith(
          (i) => pipe(Channel.write(i), Channel.as([`Inner-${i}`])),
          (a: Array<string>, b) => [...a, ...b],
          (a, b) => [a, b] as const
        ),
        Channel.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(chunk), [1, 2, 3])
      deepStrictEqual(array1, ["Inner-1", "Inner-2", "Inner-3"])
      deepStrictEqual(array2, ["Outer-0"])
    }))

  it.effect("concatMap - custom 1", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.writeAll(1, 2, 3, 4),
        Channel.concatMapWithCustom(
          (x) =>
            Channel.writeAll(
              Option.some([x, 1]) as Option.Option<readonly [number, number]>,
              Option.none() as Option.Option<readonly [number, number]>,
              Option.some([x, 2]) as Option.Option<readonly [number, number]>,
              Option.none() as Option.Option<readonly [number, number]>,
              Option.some([x, 3]) as Option.Option<readonly [number, number]>,
              Option.none() as Option.Option<readonly [number, number]>,
              Option.some([x, 4]) as Option.Option<readonly [number, number]>
            ),
          constVoid,
          constVoid,
          UpstreamPullRequest.match({
            onPulled: () => UpstreamPullStrategy.PullAfterNext(Option.none()),
            onNoUpstream: () => UpstreamPullStrategy.PullAfterAllEnqueued(Option.none())
          }),
          Option.match({
            onNone: () => ChildExecutorDecision.Yield(),
            onSome: () => ChildExecutorDecision.Continue()
          })
        ),
        Channel.runCollect,
        Effect.map(([chunk]) => pipe(Chunk.toReadonlyArray(chunk), Array.getSomes))
      )
      deepStrictEqual(result, [
        [1, 1] as const,
        [2, 1] as const,
        [3, 1] as const,
        [4, 1] as const,
        [1, 2] as const,
        [2, 2] as const,
        [3, 2] as const,
        [4, 2] as const,
        [1, 3] as const,
        [2, 3] as const,
        [3, 3] as const,
        [4, 3] as const,
        [1, 4] as const,
        [2, 4] as const,
        [3, 4] as const,
        [4, 4] as const
      ])
    }))

  it.effect("concatMap - custom 2", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.writeAll(1, 2, 3, 4),
        Channel.concatMapWithCustom(
          (x) =>
            Channel.writeAll(
              Option.some([x, 1]) as Option.Option<readonly [number, number]>,
              Option.none() as Option.Option<readonly [number, number]>,
              Option.some([x, 2]) as Option.Option<readonly [number, number]>,
              Option.none() as Option.Option<readonly [number, number]>,
              Option.some([x, 3]) as Option.Option<readonly [number, number]>,
              Option.none() as Option.Option<readonly [number, number]>,
              Option.some([x, 4]) as Option.Option<readonly [number, number]>
            ),
          constVoid,
          constVoid,
          () => UpstreamPullStrategy.PullAfterAllEnqueued(Option.none()),
          Option.match({
            onNone: () => ChildExecutorDecision.Yield(),
            onSome: () => ChildExecutorDecision.Continue()
          })
        ),
        Channel.runCollect,
        Effect.map(([chunk]) => pipe(Chunk.toReadonlyArray(chunk), Array.getSomes))
      )
      deepStrictEqual(result, [
        [1, 1] as const,
        [2, 1] as const,
        [1, 2] as const,
        [3, 1] as const,
        [2, 2] as const,
        [1, 3] as const,
        [4, 1] as const,
        [3, 2] as const,
        [2, 3] as const,
        [1, 4] as const,
        [4, 2] as const,
        [3, 3] as const,
        [2, 4] as const,
        [4, 3] as const,
        [3, 4] as const,
        [4, 4] as const
      ])
    }))
})
