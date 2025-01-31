import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Sink", () => {
  it.effect("contextWithSink", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<string>("string")
      const sink = pipe(
        Sink.contextWithSink((env: Context.Context<string>) => Sink.succeed(pipe(env, Context.get(tag)))),
        Sink.provideContext(pipe(Context.empty(), Context.add(tag, "use this")))
      )
      const result = yield* pipe(Stream.make("ignore this"), Stream.run(sink))
      strictEqual(result, "use this")
    }))
})
