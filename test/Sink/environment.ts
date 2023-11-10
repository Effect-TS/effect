import { Context, Effect, Sink, Stream } from "effect"
import * as it from "effect-test/utils/extend"
import { pipe } from "effect/Function"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("contextWithSink", () =>
    Effect.gen(function*($) {
      const tag = Context.Tag<string>()
      const sink = pipe(
        Sink.contextWithSink((env: Context<string>) => Sink.succeed(pipe(env, Context.get(tag)))),
        Sink.provideContext(pipe(Context.empty(), Context.add(tag, "use this")))
      )
      const result = yield* $(Stream.make("ignore this"), Stream.run(sink))
      assert.strictEqual(result, "use this")
    }))
})
