import { Stream } from "effect"
import * as Sse from "effect/encoding/Sse"
import { describe, expect, it } from "tstyche"

declare const input: Stream.Stream<string, "Disconnected">

describe("Sse", () => {
  it("decodeAnyEvent emits retry directives as values and preserves upstream errors", () => {
    const events = input.pipe(Stream.pipeThroughChannel(Sse.decodeAnyEvent()))
    expect(events).type.toBe<Stream.Stream<Sse.Event | Sse.Retry, "Disconnected" | Sse.SseError>>()
  })
})
