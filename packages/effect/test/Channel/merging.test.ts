import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constTrue, pipe } from "effect/Function"
import * as MergeDecision from "effect/MergeDecision"
import * as Ref from "effect/Ref"

describe("Channel", () => {
  it.effect("mergeWith - simple merge", () =>
    Effect.gen(function*() {
      const [chunk, value] = yield* pipe(
        Channel.writeAll(1, 2, 3),
        Channel.mergeWith({
          other: Channel.writeAll(4, 5, 6),
          // TODO: remove
          onSelfDone: (leftDone) => MergeDecision.AwaitConst(Effect.suspend(() => leftDone)),
          onOtherDone: (rightDone) => MergeDecision.AwaitConst(Effect.suspend(() => rightDone))
        }),
        Channel.runCollect
      )
      deepStrictEqual(Array.from(chunk), [1, 2, 3, 4, 5, 6])
      strictEqual(value, undefined)
    }))

  it.effect("mergeWith - merge with different types", () =>
    Effect.gen(function*() {
      const left = pipe(
        Channel.write(1),
        Channel.zipRight(
          pipe(
            Effect.try(() => "whatever"),
            Effect.catchAllCause((cause) =>
              Cause.isRuntimeException(cause) ?
                Effect.failCause(cause) :
                Effect.die(cause)
            ),
            Channel.fromEffect
          )
        )
      )
      const right = pipe(
        Channel.write(2),
        Channel.zipRight(
          pipe(
            Effect.try(constTrue),
            Effect.catchAllCause((cause) =>
              Cause.isIllegalArgumentException(cause) ?
                Effect.failCause(cause) :
                Effect.die(cause)
            ),
            Channel.fromEffect
          )
        )
      )
      const [chunk, value] = yield* pipe(
        left,
        Channel.mergeWith({
          other: right,
          // TODO: remove
          onSelfDone: (leftDone) =>
            MergeDecision.Await((rightDone) => Effect.suspend(() => Exit.zip(leftDone, rightDone))),
          onOtherDone: (rightDone) =>
            MergeDecision.Await((leftDone) => Effect.suspend(() => Exit.zip(leftDone, rightDone)))
        }),
        Channel.runCollect
      )
      deepStrictEqual(Array.from(chunk), [1, 2])
      deepStrictEqual(value, ["whatever", true])
    }))

  it.effect("mergeWith - handles polymorphic failures", () =>
    Effect.gen(function*() {
      const left = pipe(
        Channel.write(1),
        Channel.zipRight(pipe(Channel.fail("boom"), Channel.as(true)))
      )
      const right = pipe(
        Channel.write(2),
        Channel.zipRight(pipe(Channel.fail(true), Channel.as(true)))
      )
      const result = yield* pipe(
        left,
        Channel.mergeWith({
          other: right,
          onSelfDone: (leftDone) =>
            MergeDecision.Await((rightDone) =>
              pipe(
                // TODO: remove
                Effect.suspend(() => leftDone),
                Effect.flip,
                // TODO: remove
                Effect.zip(Effect.flip(Effect.suspend(() => rightDone))),
                Effect.flip
              )
            ),
          onOtherDone: (rightDone) =>
            MergeDecision.Await((leftDone) =>
              pipe(
                // TODO: remove
                Effect.suspend(() => leftDone),
                Effect.flip,
                // TODO: remove
                Effect.zip(Effect.flip(Effect.suspend(() => rightDone))),
                Effect.flip
              )
            )
        }),
        Channel.runDrain,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail<[string, boolean]>(["boom", true]))
    }))

  it.effect("mergeWith - interrupts losing side", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const interrupted = yield* (Ref.make(false))
      const left = Channel.zipRight(
        Channel.write(1),
        pipe(
          Deferred.succeed(latch, void 0),
          Effect.zipRight(Effect.never),
          Effect.onInterrupt(() => Ref.set(interrupted, true)),
          Channel.fromEffect
        )
      )
      const right = Channel.zipRight(
        Channel.write(2),
        Channel.fromEffect(Deferred.await(latch))
      )
      const merged = Channel.mergeWith(left, {
        other: right,
        // TODO: remove
        onSelfDone: (leftDone) => MergeDecision.Done(Effect.suspend(() => leftDone)),
        onOtherDone: (_rightDone) =>
          MergeDecision.Done(pipe(
            Ref.get(interrupted),
            Effect.flatMap((isInterrupted) => isInterrupted ? Effect.void : Effect.fail(void 0))
          ))
      })
      const result = yield* (Effect.exit(Channel.runDrain(merged)))
      deepStrictEqual(result, Exit.succeed(void 0))
    }))
})
