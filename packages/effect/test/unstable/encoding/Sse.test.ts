import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import * as Schema from "effect/Schema"
import * as Sse from "effect/unstable/encoding/Sse"

describe("Sse", () => {
  it("Event preserves string payloads", () => {
    const decode = Schema.decodeUnknownSync(Sse.Event)
    const encode = Schema.encodeSync(Sse.Event)

    const event = decode({
      _tag: "Event",
      event: "message",
      id: undefined,
      data: "{\"type\":\"ok\"}"
    })

    assert.strictEqual(event.data, "{\"type\":\"ok\"}")
    assert.deepStrictEqual(encode(event), {
      _tag: "Event",
      event: "message",
      id: undefined,
      data: "{\"type\":\"ok\"}"
    })
  })

  it("EventEncoded consumers can explicitly decode json payloads", () => {
    const EventWithJsonPayload = Schema.Struct({
      ...Sse.EventEncoded.fields,
      data: Schema.fromJsonString(Schema.Struct({
        type: Schema.String
      }))
    })
    const decode = Schema.decodeUnknownSync(EventWithJsonPayload)

    const event = decode({
      event: "message",
      id: undefined,
      data: "{\"type\":\"ok\"}"
    })

    assert.deepStrictEqual(event.data, { type: "ok" })
  })

  it.effect("decodeDataSchema decodes json payload from SSE stream", () =>
    Effect.gen(function*() {
      const events = yield* Stream.make(
        "event: message\ndata: {\"type\":\"ok\"}\n\n"
      ).pipe(
        Stream.pipeThroughChannel(Sse.decodeDataSchema(Schema.Struct({ type: Schema.String }))),
        Stream.runCollect
      )

      assert.deepStrictEqual([...events], [{
        event: "message",
        id: undefined,
        data: {
          type: "ok"
        }
      }])
    }))

  it.effect("fails when an unterminated line exceeds maxEventSize", () =>
    Effect.gen(function*() {
      const error = yield* Stream.make("12345").pipe(
        Stream.pipeThroughChannel(Sse.decode({ maxEventSize: 4 })),
        Stream.runCollect,
        Effect.flip
      )

      assert.instanceOf(error, Sse.SseError)
      assert.instanceOf(error.reason, Sse.EventTooLarge)
      assert.strictEqual(error.reason.maxEventSize, 4)
    }))

  it.effect("fails when pending data exceeds maxEventSize", () =>
    Effect.gen(function*() {
      const error = yield* Stream.make("data: a\n", "data: b\n").pipe(
        Stream.pipeThroughChannel(Sse.decode({ maxEventSize: 3 })),
        Stream.runCollect,
        Effect.flip
      )

      assert.instanceOf(error, Sse.SseError)
      assert.instanceOf(error.reason, Sse.EventTooLarge)
      assert.strictEqual(error.reason.maxEventSize, 3)
    }))

  it.effect("parses pending state just under maxEventSize", () =>
    Effect.gen(function*() {
      const events = yield* Stream.make("data: a\ndata: b", "\n\n").pipe(
        Stream.pipeThroughChannel(Sse.decode({ maxEventSize: 10 })),
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
        Stream.pipeThroughChannel(Sse.decode()),
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
