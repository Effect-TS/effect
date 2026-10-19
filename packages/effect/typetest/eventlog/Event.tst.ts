import type { Effect } from "effect"
import { Schema } from "effect"
import type * as Event from "effect/eventlog/Event"
import { describe, expect, it } from "tstyche"

declare const event: Event.Any

describe("Event.Any", () => {
  it("decodes binary payloads without a cast", () => {
    expect(Schema.decodeUnknownEffect(event.payloadSchemaBinary)(new Uint8Array())).type.toBe<
      Effect.Effect<unknown, Schema.SchemaError, unknown>
    >()
  })
})
