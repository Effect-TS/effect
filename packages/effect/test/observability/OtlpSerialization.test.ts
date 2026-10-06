import { assert, describe, it } from "@effect/vitest"
import { encodeAnyValue, encodeMetric } from "effect/observability/internal/otlpProtobuf"

describe("OtlpSerialization", () => {
  it("encodes a negative protobuf int64 as a ten-byte varint", () => {
    const encoded = encodeAnyValue({ intValue: -1 })
    assert.strictEqual(encoded.length, 11)
    assert.deepStrictEqual(Array.from(encoded), [0x18, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01])
  })
  it("encodes a Summary metric as field 11 with quantile values", () => {
    const encoded = encodeMetric({
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
    })
    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength)
    // name, then Metric.summary (11, LEN) > Summary.data_points (1, LEN)
    assert.deepStrictEqual(Array.from(encoded.slice(0, 7)), [0x0a, 0x01, 0x73, 0x5a, 0x3a, 0x0a, 0x38])
    assert.strictEqual(encoded[7], 0x11) // start_time_unix_nano (2, I64)
    assert.strictEqual(view.getBigUint64(26, true), 3n) // count (4, I64)
    assert.strictEqual(encoded[34], 0x29) // sum (5, I64)
    assert.strictEqual(view.getFloat64(35, true), 6)
    // quantile_values (6, LEN) > quantile (1, I64), value (2, I64)
    assert.deepStrictEqual(Array.from(encoded.slice(43, 46)), [0x32, 0x12, 0x09])
    assert.strictEqual(view.getFloat64(46, true), 0.5)
    assert.strictEqual(encoded[54], 0x11)
    assert.strictEqual(view.getFloat64(55, true), 2)
    assert.strictEqual(encoded.length, 63)
  })
})
