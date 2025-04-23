import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as HashSet from "effect/HashSet"
import * as MergeDecision from "effect/MergeDecision"
import * as Option from "effect/Option"
import * as Random from "effect/Random"
import * as Ref from "effect/Ref"

export const mapper = <A, B>(
  f: (a: A) => B
): Channel.Channel<B, A, never, unknown, void, unknown> => {
  return Channel.readWith({
    onInput: (a: A) =>
      Channel.flatMap(
        Channel.write(f(a)),
        () => mapper(f)
      ),
    onFailure: () => Channel.void,
    onDone: () => Channel.void
  })
}

export const refWriter = <A>(
  ref: Ref.Ref<ReadonlyArray<A>>
): Channel.Channel<never, A, never, unknown, void, unknown> => {
  return Channel.readWith({
    onInput: (a: A) =>
      Channel.flatMap(
        Channel.fromEffect(Effect.asVoid(Ref.update(ref, Array.prepend(a)))),
        () => refWriter(ref)
      ),
    onFailure: () => Channel.void,
    onDone: () => Channel.void
  })
}

export const refReader = <A>(
  ref: Ref.Ref<Array<A>>
): Channel.Channel<A, unknown, never, unknown, void, unknown> => {
  return pipe(
    Channel.fromEffect(
      Ref.modify(ref, (array) => {
        if (Array.isEmptyReadonlyArray(array)) {
          return [Option.none(), Array.empty<A>()] as const
        }
        return [Option.some(array[0]!), array.slice(1)] as const
      })
    ),
    Channel.flatMap(Option.match({
      onNone: () => Channel.void,
      onSome: (i) => Channel.flatMap(Channel.write(i), () => refReader(ref))
    }))
  )
}

describe("Channel", () => {
  it.effect("simple reads", () =>
    Effect.gen(function*() {
      class Whatever implements Equal.Equal {
        constructor(readonly i: number) {}
        [Hash.symbol](): number {
          return Hash.hash(this.i)
        }
        [Equal.symbol](u: unknown): boolean {
          return u instanceof Whatever && u.i === this.i
        }
      }
      const left = Channel.writeAll(1, 2, 3)
      const right = pipe(
        Channel.read<number>(),
        Channel.catchAll(() => Channel.succeed(4)),
        Channel.flatMap((i) => Channel.write(new Whatever(i)))
      )
      const channel = pipe(
        left,
        Channel.pipeTo(
          pipe(
            right,
            Channel.zipRight(right),
            Channel.zipRight(right),
            Channel.zipRight(right)
          )
        )
      )
      const result = yield* (Channel.runCollect(channel))
      const [chunk, value] = result
      deepStrictEqual(Chunk.toReadonlyArray(chunk), [
        new Whatever(1),
        new Whatever(2),
        new Whatever(3),
        new Whatever(4)
      ])
      strictEqual(value, undefined)
    }))

  it.effect("read pipelining", () =>
    Effect.gen(function*() {
      const innerChannel = pipe(
        Channel.fromEffect(Ref.make<ReadonlyArray<number>>([])),
        Channel.flatMap((ref) => {
          const inner = (): Channel.Channel<number, number, never, unknown, void, unknown> =>
            Channel.readWith({
              onInput: (input: number) =>
                pipe(
                  Channel.fromEffect(Ref.update(ref, (array) => [...array, input])),
                  Channel.zipRight(Channel.write(input)),
                  Channel.flatMap(inner)
                ),
              onFailure: () => Channel.void,
              onDone: () => Channel.void
            })
          return pipe(
            inner(),
            Channel.zipRight(Channel.fromEffect(Ref.get(ref)))
          )
        })
      )
      const f = (n: number) => n
      const g = (n: number) => [n, n]
      const channel = pipe(
        Channel.writeAll(1, 2),
        Channel.pipeTo(mapper(f)),
        Channel.pipeTo(pipe(mapper(g), Channel.concatMap((ns) => Channel.writeAll(...ns)), Channel.asVoid)),
        Channel.pipeTo(innerChannel)
      )
      const [chunk, list] = yield* (Channel.runCollect(channel))
      deepStrictEqual(Chunk.toReadonlyArray(chunk), [1, 1, 2, 2])
      deepStrictEqual(list, [1, 1, 2, 2])
    }))

  it.effect("read pipelining 2", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<number>>([]))
      const intProducer: Channel.Channel<number, unknown, never, unknown, void, unknown> = Channel.writeAll(
        1,
        2,
        3,
        4,
        5
      )
      const readIntsN = (
        n: number
      ): Channel.Channel<number, number, never, unknown, string, unknown> =>
        n > 0
          ? Channel.readWith({
            onInput: (i: number) => pipe(Channel.write(i), Channel.flatMap(() => readIntsN(n - 1))),
            onFailure: () => Channel.succeed("EOF"),
            onDone: () => Channel.succeed("EOF")
          })
          : Channel.succeed("end")

      const sum = (
        label: string,
        n: number
      ): Channel.Channel<never, number, unknown, unknown, void, unknown> =>
        Channel.readWith({
          onInput: (input: number) => sum(label, n + input),
          onFailure: () => Channel.fromEffect(Ref.update(ref, (array) => [...array, n])),
          onDone: () => Channel.fromEffect(Ref.update(ref, (array) => [...array, n]))
        })

      const channel = pipe(
        intProducer,
        Channel.pipeTo(
          pipe(
            readIntsN(2),
            Channel.pipeTo(sum("left", 0)),
            Channel.zipRight(readIntsN(2)),
            Channel.pipeTo(sum("right", 0))
          )
        )
      )
      const result = yield* pipe(Channel.run(channel), Effect.zipRight(Ref.get(ref)))
      deepStrictEqual(result, [3, 7])
    }))

  it.effect("reading with resources", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<string>>([]))
      const event = (label: string) => Ref.update(ref, (array) => [...array, label])
      const left = pipe(
        Channel.acquireReleaseOut(
          event("Acquire outer"),
          () => event("Release outer")
        ),
        Channel.concatMap(
          () =>
            pipe(
              Channel.writeAll(1, 2, 3),
              Channel.concatMap((i) =>
                Channel.acquireReleaseOut(
                  pipe(event(`Acquire ${i}`), Effect.as(i)),
                  () => event(`Release ${i}`)
                )
              )
            )
        )
      )
      const read = pipe(
        Channel.read<number>(),
        Channel.mapEffect((i) => event(`Read ${i}`)),
        Channel.asVoid
      )
      const right = pipe(
        read,
        Channel.zipRight(read),
        Channel.catchAll(() => Channel.void)
      )
      const channel = pipe(left, Channel.pipeTo(right))
      const result = yield* pipe(Channel.runDrain(channel), Effect.zipRight(Ref.get(ref)))
      deepStrictEqual(result, [
        "Acquire outer",
        "Acquire 1",
        "Read 1",
        "Release 1",
        "Acquire 2",
        "Read 2",
        "Release 2",
        "Release outer"
      ])
    }))

  it.effect("simple concurrent reads", () =>
    Effect.gen(function*() {
      const capacity = 128
      const elements = yield* (Effect.replicateEffect(Random.nextInt, capacity))
      const source = yield* (Ref.make(Array.fromIterable(elements)))
      const destination = yield* (Ref.make<ReadonlyArray<number>>([]))
      const twoWriters = pipe(
        refWriter(destination),
        Channel.mergeWith({
          other: refWriter(destination),
          onSelfDone: () => MergeDecision.AwaitConst(Effect.void),
          onOtherDone: () => MergeDecision.AwaitConst(Effect.void)
        })
      )
      const [missing, surplus] = yield* pipe(
        refReader(source),
        Channel.pipeTo(twoWriters),
        Channel.mapEffect(() => Ref.get(destination)),
        Channel.run,
        Effect.map((result) => {
          let missing = HashSet.fromIterable(elements)
          let surplus = HashSet.fromIterable(result)
          for (const value of result) {
            missing = pipe(missing, HashSet.remove(value))
          }
          for (const value of elements) {
            surplus = pipe(surplus, HashSet.remove(value))
          }
          return [missing, surplus] as const
        })
      )

      strictEqual(HashSet.size(missing), 0)
      strictEqual(HashSet.size(surplus), 0)
    }))

  it.effect("nested concurrent reads", () =>
    Effect.gen(function*() {
      const capacity = 128
      const f = (n: number) => n + 1
      const elements = yield* (Effect.replicateEffect(Random.nextInt, capacity))
      const source = yield* (Ref.make(Array.fromIterable(elements)))
      const destination = yield* (Ref.make<ReadonlyArray<number>>([]))
      const twoWriters = pipe(
        mapper(f),
        Channel.pipeTo(refWriter(destination)),
        Channel.mergeWith({
          other: pipe(mapper(f), Channel.pipeTo(refWriter(destination))),
          onSelfDone: () => MergeDecision.AwaitConst(Effect.void),
          onOtherDone: () => MergeDecision.AwaitConst(Effect.void)
        })
      )
      const [missing, surplus] = yield* pipe(
        refReader(source),
        Channel.pipeTo(twoWriters),
        Channel.mapEffect(() => Ref.get(destination)),
        Channel.run,
        Effect.map((result) => {
          const expected = HashSet.fromIterable(elements.map(f))
          let missing = HashSet.fromIterable(expected)
          let surplus = HashSet.fromIterable(result)
          for (const value of result) {
            missing = pipe(missing, HashSet.remove(value))
          }
          for (const value of expected) {
            surplus = pipe(surplus, HashSet.remove(value))
          }
          return [missing, surplus] as const
        })
      )
      strictEqual(HashSet.size(missing), 0)
      strictEqual(HashSet.size(surplus), 0)
    }))
})
