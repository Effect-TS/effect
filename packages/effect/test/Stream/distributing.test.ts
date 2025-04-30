import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constTrue, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("distributedWithDynamic - ensures no race between subscription and stream end", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.empty,
        Stream.distributedWithDynamic({
          maximumLag: 1,
          decide: () => Effect.succeed(constTrue)
        }),
        Effect.flatMap((add) => {
          const subscribe = pipe(
            add,
            Effect.map(([_, queue]) =>
              pipe(
                Stream.fromQueue(queue),
                Stream.filterMapWhile(Exit.match({
                  onFailure: Option.none,
                  onSuccess: Option.some
                }))
              )
            ),
            Stream.unwrap
          )
          return pipe(
            Deferred.make<void>(),
            Effect.flatMap((onEnd) =>
              pipe(
                subscribe,
                Stream.ensuring(Deferred.succeed(onEnd, void 0)),
                Stream.runDrain,
                Effect.fork,
                Effect.zipRight(Deferred.await(onEnd)),
                Effect.zipRight(Stream.runDrain(subscribe))
              )
            )
          )
        }),
        Effect.scoped
      )
      strictEqual(result, undefined)
    }))
})
