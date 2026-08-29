import * as Sse from "@effect/experimental/Sse"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Stream } from "effect"

describe("Sse", () => {
  it.effect("fails when an unterminated line exceeds maxEventSize", () =>
    Effect.gen(function*() {
      const exit = yield* Stream.make("12345").pipe(
        Stream.pipeThroughChannel(Sse.makeChannel({ maxEventSize: 4 })),
        Stream.runCollect,
        Effect.exit
      )

      assert(Exit.isFailure(exit))
      const [error] = Cause.defects(exit.cause)
      assert.instanceOf(error, Sse.SseError)
      assert.instanceOf(error.cause, Sse.EventTooLarge)
      assert.strictEqual(error.cause.maxEventSize, 4)
    }))

  it.effect("fails when pending data exceeds maxEventSize", () =>
    Effect.gen(function*() {
      const exit = yield* Stream.make("data: a\n", "data: b\n").pipe(
        Stream.pipeThroughChannel(Sse.makeChannel({ maxEventSize: 3 })),
        Stream.runCollect,
        Effect.exit
      )

      assert(Exit.isFailure(exit))
      const [error] = Cause.defects(exit.cause)
      assert.instanceOf(error, Sse.SseError)
      assert.instanceOf(error.cause, Sse.EventTooLarge)
      assert.strictEqual(error.cause.maxEventSize, 3)
    }))

  it.effect("parses pending state just under maxEventSize", () =>
    Effect.gen(function*() {
      const events = yield* Stream.make("data: a\ndata: b", "\n\n").pipe(
        Stream.pipeThroughChannel(Sse.makeChannel({ maxEventSize: 10 })),
        Stream.runCollect
      )

      assert.deepStrictEqual([...events], [{
        _tag: "Event",
        event: "message",
        id: undefined,
        data: "a\nb"
      }])
    }))

  it.effect("parses well-formed events split across chunks", () =>
    Effect.gen(function*() {
      const events = yield* Stream.make(
        "id: 1\nevent: up",
        "date\ndata: hel",
        "lo\n",
        "\n"
      ).pipe(
        Stream.pipeThroughChannel(Sse.makeChannel()),
        Stream.runCollect
      )

      assert.deepStrictEqual([...events], [{
        _tag: "Event",
        event: "update",
        id: "1",
        data: "hello"
      }])
    }))
})
