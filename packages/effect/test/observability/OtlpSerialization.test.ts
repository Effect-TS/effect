import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { OtlpSerialization } from "effect/observability"
import { encodeAnyValue } from "effect/observability/internal/otlpProtobuf"

describe("OtlpSerialization", () => {
  it("encodes a negative protobuf int64 as a ten-byte varint", () => {
    const encoded = encodeAnyValue({ intValue: -1 })
    assert.strictEqual(encoded.length, 11)
    assert.deepStrictEqual(Array.from(encoded), [0x18, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01])
  })

  it.effect("layerProtobuf encodes Summary metrics", () =>
    Effect.gen(function*() {
      const serialization = yield* OtlpSerialization.OtlpSerialization
      const body = serialization.metrics({
        resourceMetrics: [{
          resource: { attributes: [], droppedAttributesCount: 0 },
          scopeMetrics: [{
            scope: { name: "s" },
            metrics: [{
              name: "s",
              summary: {
                dataPoints: [{
                  attributes: [],
                  startTimeUnixNano: "1",
                  timeUnixNano: "2",
                  count: 3,
                  sum: 6,
                  quantileValues: [{ quantile: 0.5, value: 2 }]
                }]
              }
            }]
          }]
        }]
      })
      assert.strictEqual(body._tag, "Uint8Array")
      assert.deepStrictEqual(
        Array.from(body._tag === "Uint8Array" ? body.body : []),
        [
          [0x0a, 0x4a], // resource_metrics
          [0x0a, 0x00], // resource
          [0x12, 0x46], // scope_metrics
          [0x0a, 0x03, 0x0a, 0x01, 0x73], // scope { name: "s" }
          [0x12, 0x3f], // metrics
          [0x0a, 0x01, 0x73], // name: "s"
          [0x5a, 0x3a], // summary (field 11)
          [0x0a, 0x38], // data_points
          [0x11, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // start_time_unix_nano: 1
          [0x19, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // time_unix_nano: 2
          [0x21, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // count: 3
          [0x29, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x40], // sum: 6.0
          [0x32, 0x12], // quantile_values
          [0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x3f], // quantile: 0.5
          [0x11, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40] // value: 2.0
        ].flat()
      )
    }).pipe(Effect.provide(OtlpSerialization.layerProtobuf)))
})
