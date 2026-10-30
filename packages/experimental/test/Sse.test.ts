import * as Sse from "@effect/experimental/Sse"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Stream } from "effect"

describe("Sse", () => {
  it("strips CR and LF from id and event so they cannot inject fields or events", () => {
    const events: Array<Sse.AnyEvent> = []
    const parser = Sse.makeParser((event) => events.push(event))

    parser.feed(Sse.encoder.write({
      _tag: "Event",
      id: "1\nretry: 1000",
      event: "update\r\ndata: forged\r\rid: 2\n\n",
      data: "real"
    }))

    assert.deepStrictEqual(events, [{
      _tag: "Event",
      id: "1retry: 1000",
      event: "updatedata: forgedid: 2",
      data: "real"
    }])
  })

  it("strips NUL from id so the encoded id is not ignored by parsers", () => {
    const events: Array<Sse.AnyEvent> = []
    const parser = Sse.makeParser((event) => events.push(event))

    parser.feed(Sse.encoder.write({ _tag: "Event", id: "2\u00003", event: "message", data: "x" }))

    assert.deepStrictEqual(events, [{ _tag: "Event", id: "23", event: "message", data: "x" }])
  })

  it("roundtrips CR, CRLF and LF data lines, preserving a trailing empty line", () => {
    const input: Sse.Event = { _tag: "Event", event: "message", id: undefined, data: "10%\r50%\r\ndone\n" }
    const events: Array<Sse.AnyEvent> = []
    const parser = Sse.makeParser((event) => events.push(event))

    parser.feed(Sse.encoder.write(input))

    assert.deepStrictEqual(events, [{ ...input, data: "10%\n50%\ndone\n" }])
  })

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
