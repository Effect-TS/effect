import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Channel from "effect/Channel"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

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
  it.effect("ensuring - prompt closure between continuations", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<string>>([]))
      const event = (label: string) => Ref.update(ref, (array) => [...array, label])
      const channel = pipe(
        Channel.fromEffect(event("Acquire1")),
        Channel.ensuring(event("Release11")),
        Channel.ensuring(event("Release12")),
        Channel.flatMap(() =>
          pipe(
            Channel.fromEffect(event("Acquire2")),
            Channel.ensuring(event("Release2"))
          )
        )
      )
      const result = yield* pipe(Channel.runDrain(channel), Effect.zipRight(Ref.get(ref)))
      deepStrictEqual(result, [
        "Acquire1",
        "Release11",
        "Release12",
        "Acquire2",
        "Release2"
      ])
    }))

  it.effect("ensuring - last finalizers are deferred to the scope", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<string>>([]))
      function event(label: string) {
        return Ref.update(ref, (array) => [...array, label])
      }
      const channel = pipe(
        Channel.fromEffect(event("Acquire1")),
        Channel.ensuring(event("Release11")),
        Channel.ensuring(event("Release12")),
        Channel.zipRight(
          pipe(
            Channel.fromEffect(event("Acquire2")),
            Channel.ensuring(event("Release2"))
          )
        ),
        Channel.ensuring(event("ReleaseOuter"))
      )
      const [eventsInScope, eventsOutsideScope] = yield* pipe(
        Channel.toPull(channel),
        Effect.flatMap((pull) => pipe(Effect.exit(pull), Effect.zipRight(Ref.get(ref)))),
        Effect.scoped,
        Effect.zip(Ref.get(ref))
      )
      deepStrictEqual(eventsInScope, [
        "Acquire1",
        "Release11",
        "Release12",
        "Acquire2"
      ])
      deepStrictEqual(eventsOutsideScope, [
        "Acquire1",
        "Release11",
        "Release12",
        "Acquire2",
        "Release2",
        "ReleaseOuter"
      ])
    }))

  it.effect("ensuring - mixture of concatMap and ensuring", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<string>>([]))
      const event = (label: string) => Ref.update(ref, (array) => [...array, label])
      const channel = pipe(
        Channel.writeAll(1, 2, 3),
        Channel.ensuring(event("Inner")),
        Channel.concatMap((i) =>
          pipe(
            Channel.write(First(i)),
            Channel.ensuring(event("First write"))
          )
        ),
        Channel.ensuring(event("First concatMap")),
        Channel.concatMap((first) =>
          pipe(
            Channel.write(Second(first)),
            Channel.ensuring(event("Second write"))
          )
        ),
        Channel.ensuring(event("Second concatMap"))
      )
      const [[elements], events] = yield* pipe(
        Channel.runCollect(channel),
        Effect.zip(Ref.get(ref))
      )
      deepStrictEqual(events, [
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
      deepStrictEqual(Array.from(elements), [
        Second(First(1)),
        Second(First(2)),
        Second(First(3))
      ])
    }))

  it.effect("ensuring - finalizer ordering 2", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<string>>([]))
      const event = (label: string) => Ref.update(ref, (array) => [...array, label])
      const channel = pipe(
        Channel.writeAll(1, 2),
        Channel.mapOutEffect((n) => pipe(event(`pulled ${n}`), Effect.as(n))),
        Channel.concatMap((n) =>
          pipe(
            Channel.write(n),
            Channel.ensuring(event(`close ${n}`))
          )
        )
      )
      yield* (Channel.runDrain(channel))
      const result = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), [
        "pulled 1",
        "close 1",
        "pulled 2",
        "close 2"
      ])
    }))

  it.effect("ensuring - finalizer failure is propagated", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Channel.void,
        Channel.ensuring(Effect.dieMessage("die")),
        Channel.ensuring(Effect.void),
        Channel.runDrain,
        Effect.exit
      )
      assertTrue(Exit.isFailure(result))
    }))
})
