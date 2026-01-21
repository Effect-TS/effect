import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as OtlpProtobuf from "../src/internal/otlpProtobuf.js"
import * as Proto from "../src/internal/protobuf.js"
import * as OtlpSerialization from "../src/OtlpSerialization.js"

describe("Protobuf encoding", () => {
  describe("primitives", () => {
    it("encodeVarint small values", () => {
      // 0 encodes to [0]
      expect(Proto.encodeVarint(0)).toEqual(new Uint8Array([0]))
      // 1 encodes to [1]
      expect(Proto.encodeVarint(1)).toEqual(new Uint8Array([1]))
      // 127 encodes to [127] (single byte max)
      expect(Proto.encodeVarint(127)).toEqual(new Uint8Array([127]))
      // 128 encodes to [128, 1] (requires continuation bit)
      expect(Proto.encodeVarint(128)).toEqual(new Uint8Array([128, 1]))
      // 300 encodes to [172, 2]
      expect(Proto.encodeVarint(300)).toEqual(new Uint8Array([172, 2]))
    })

    it("encodeVarint large values", () => {
      // 16384 = 0x4000 encodes to [128, 128, 1]
      expect(Proto.encodeVarint(16384)).toEqual(new Uint8Array([128, 128, 1]))
    })

    it("encodeFixed64", () => {
      const result = Proto.encodeFixed64(BigInt("1234567890123456789"))
      expect(result.length).toBe(8)
      // Little-endian encoding
      const view = new DataView(result.buffer)
      expect(view.getBigUint64(0, true)).toBe(BigInt("1234567890123456789"))
    })

    it("encodeFixed32", () => {
      const result = Proto.encodeFixed32(0x12345678)
      expect(result.length).toBe(4)
      const view = new DataView(result.buffer)
      expect(view.getUint32(0, true)).toBe(0x12345678)
    })

    it("encodeDouble", () => {
      const result = Proto.encodeDouble(3.14159)
      expect(result.length).toBe(8)
      const view = new DataView(result.buffer)
      expect(view.getFloat64(0, true)).toBeCloseTo(3.14159)
    })

    it("encodeString", () => {
      const result = Proto.encodeString("hello")
      expect(result).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
    })

    it("encodeHexBytes", () => {
      const result = Proto.encodeHexBytes("deadbeef")
      expect(result).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
    })

    it("concat", () => {
      const a = new Uint8Array([1, 2, 3])
      const b = new Uint8Array([4, 5])
      const c = new Uint8Array([6])
      const result = Proto.concat(a, b, c)
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
    })
  })

  describe("field encoders", () => {
    it("varintField", () => {
      // field 1, value 150
      // tag = (1 << 3) | 0 = 8
      // value = 150 = [150, 1] (as varint)
      const result = Proto.varintField(1, 150)
      expect(result).toEqual(new Uint8Array([8, 150, 1]))
    })

    it("boolField", () => {
      // field 2, true
      // tag = (2 << 3) | 0 = 16
      const trueResult = Proto.boolField(2, true)
      expect(trueResult).toEqual(new Uint8Array([16, 1]))

      const falseResult = Proto.boolField(2, false)
      expect(falseResult).toEqual(new Uint8Array([16, 0]))
    })

    it("stringField", () => {
      // field 1, value "hi"
      // tag = (1 << 3) | 2 = 10 (length-delimited)
      // length = 2
      // data = [104, 105]
      const result = Proto.stringField(1, "hi")
      expect(result).toEqual(new Uint8Array([10, 2, 104, 105]))
    })

    it("fixed64Field", () => {
      // field 1, wire type 1 (64-bit)
      // tag = (1 << 3) | 1 = 9
      const result = Proto.fixed64Field(1, BigInt(1))
      expect(result[0]).toBe(9)
      expect(result.length).toBe(9) // 1 tag + 8 data
    })

    it("messageField", () => {
      // field 2, embedded message [1, 2, 3]
      // tag = (2 << 3) | 2 = 18 (length-delimited)
      // length = 3
      const result = Proto.messageField(2, new Uint8Array([1, 2, 3]))
      expect(result).toEqual(new Uint8Array([18, 3, 1, 2, 3]))
    })
  })

  describe("OTLP types", () => {
    it("encodeAnyValue - string", () => {
      const result = OtlpProtobuf.encodeAnyValue({ stringValue: "test" })
      // field 1 (string_value), length-delimited
      // tag = (1 << 3) | 2 = 10
      expect(result[0]).toBe(10)
      expect(result[1]).toBe(4) // length
    })

    it("encodeAnyValue - bool", () => {
      const result = OtlpProtobuf.encodeAnyValue({ boolValue: true })
      // field 2 (bool_value), varint
      // tag = (2 << 3) | 0 = 16
      expect(result).toEqual(new Uint8Array([16, 1]))
    })

    it("encodeAnyValue - int", () => {
      const result = OtlpProtobuf.encodeAnyValue({ intValue: 42 })
      // field 3 (int_value), varint
      // tag = (3 << 3) | 0 = 24
      expect(result[0]).toBe(24)
    })

    it("encodeAnyValue - double", () => {
      const result = OtlpProtobuf.encodeAnyValue({ doubleValue: 3.14 })
      // field 4 (double_value), 64-bit
      // tag = (4 << 3) | 1 = 33
      expect(result[0]).toBe(33)
      expect(result.length).toBe(9) // 1 tag + 8 data
    })

    it("encodeKeyValue", () => {
      const result = OtlpProtobuf.encodeKeyValue({
        key: "test",
        value: { stringValue: "value" }
      })
      // Should contain field 1 (key) and field 2 (value)
      expect(result.length).toBeGreaterThan(0)
      // First byte should be tag for field 1 string
      expect(result[0]).toBe(10) // (1 << 3) | 2 = 10
    })

    it("encodeResource", () => {
      const result = OtlpProtobuf.encodeResource({
        attributes: [
          { key: "service.name", value: { stringValue: "test-service" } }
        ],
        droppedAttributesCount: 0
      })
      // Should encode attributes as repeated field 1
      expect(result.length).toBeGreaterThan(0)
    })

    it("encodeStatus", () => {
      const okStatus = OtlpProtobuf.encodeStatus({ code: OtlpProtobuf.StatusCode.Ok })
      expect(okStatus.length).toBeGreaterThan(0)

      const errorStatus = OtlpProtobuf.encodeStatus({
        code: OtlpProtobuf.StatusCode.Error,
        message: "test error"
      })
      expect(errorStatus.length).toBeGreaterThan(okStatus.length)
    })

    it("encodeSpan", () => {
      const result = OtlpProtobuf.encodeSpan({
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "0123456789abcdef",
        name: "test-span",
        kind: OtlpProtobuf.SpanKind.Internal,
        startTimeUnixNano: "1000000000",
        endTimeUnixNano: "2000000000",
        attributes: [
          { key: "test.attr", value: { stringValue: "value" } }
        ],
        droppedAttributesCount: 0,
        events: [],
        droppedEventsCount: 0,
        links: [],
        droppedLinksCount: 0,
        status: { code: OtlpProtobuf.StatusCode.Ok }
      })
      expect(result.length).toBeGreaterThan(0)
      // Should be a valid protobuf message
      // Verify it starts with field 1 (trace_id) bytes
      expect(result[0]).toBe(10) // (1 << 3) | 2 = 10 (length-delimited)
    })

    it("encodeTracesData", () => {
      const result = OtlpProtobuf.encodeTracesData({
        resourceSpans: [{
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "test" } }
            ],
            droppedAttributesCount: 0
          },
          scopeSpans: [{
            scope: { name: "test-scope" },
            spans: [{
              traceId: "0123456789abcdef0123456789abcdef",
              spanId: "0123456789abcdef",
              name: "test-span",
              kind: OtlpProtobuf.SpanKind.Server,
              startTimeUnixNano: "1000000000000000000",
              endTimeUnixNano: "2000000000000000000",
              attributes: [],
              droppedAttributesCount: 0,
              events: [],
              droppedEventsCount: 0,
              links: [],
              droppedLinksCount: 0,
              status: { code: OtlpProtobuf.StatusCode.Ok }
            }]
          }]
        }]
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("encodeMetricsData", () => {
      const result = OtlpProtobuf.encodeMetricsData({
        resourceMetrics: [{
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "test" } }
            ],
            droppedAttributesCount: 0
          },
          scopeMetrics: [{
            scope: { name: "test-scope" },
            metrics: [{
              name: "test.counter",
              description: "A test counter",
              unit: "1",
              sum: {
                dataPoints: [{
                  attributes: [],
                  startTimeUnixNano: "1000000000000000000",
                  timeUnixNano: "2000000000000000000",
                  asInt: "42"
                }],
                aggregationTemporality: OtlpProtobuf.AggregationTemporality.Cumulative,
                isMonotonic: true
              }
            }]
          }]
        }]
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("encodeLogsData", () => {
      const result = OtlpProtobuf.encodeLogsData({
        resourceLogs: [{
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "test" } }
            ],
            droppedAttributesCount: 0
          },
          scopeLogs: [{
            scope: { name: "test-scope" },
            logRecords: [{
              timeUnixNano: "1000000000000000000",
              severityNumber: OtlpProtobuf.SeverityNumber.Info,
              severityText: "INFO",
              body: { stringValue: "Test log message" },
              attributes: [
                { key: "log.key", value: { stringValue: "log.value" } }
              ],
              droppedAttributesCount: 0
            }]
          }]
        }]
      })
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("edge cases", () => {
    it("handles empty arrays", () => {
      const result = OtlpProtobuf.encodeTracesData({
        resourceSpans: []
      })
      // Empty repeated field should produce empty output
      expect(result.length).toBe(0)
    })

    it("handles optional fields", () => {
      const result = OtlpProtobuf.encodeSpan({
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "0123456789abcdef",
        name: "test",
        kind: OtlpProtobuf.SpanKind.Internal,
        startTimeUnixNano: "0",
        endTimeUnixNano: "0",
        attributes: [],
        droppedAttributesCount: 0,
        events: [],
        droppedEventsCount: 0,
        links: [],
        droppedLinksCount: 0,
        status: { code: OtlpProtobuf.StatusCode.Unset }
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("handles special characters in strings", () => {
      const result = OtlpProtobuf.encodeAnyValue({
        stringValue: "hello\nworld\t\r\n"
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("handles unicode strings", () => {
      const result = OtlpProtobuf.encodeAnyValue({
        stringValue: "hello"
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("handles large numbers", () => {
      const result = Proto.encodeVarint(BigInt("9223372036854775807"))
      expect(result.length).toBe(9) // Max varint size for 64-bit
    })
  })

  describe("OtlpSerialization", () => {
    const sampleTracesData = {
      resourceSpans: [{
        resource: {
          attributes: [{ key: "service.name", value: { stringValue: "test" } }],
          droppedAttributesCount: 0
        },
        scopeSpans: [{
          scope: { name: "test-scope" },
          spans: [{
            traceId: "0123456789abcdef0123456789abcdef",
            spanId: "0123456789abcdef",
            name: "test-span",
            kind: 1,
            startTimeUnixNano: "1000000000000000000",
            endTimeUnixNano: "2000000000000000000",
            attributes: [],
            droppedAttributesCount: 0,
            events: [],
            droppedEventsCount: 0,
            links: [],
            droppedLinksCount: 0,
            status: { code: 1 }
          }]
        }]
      }]
    }

    it.effect("json serializer returns HttpBody with json content type", () =>
      Effect.gen(function*() {
        const serialization = yield* OtlpSerialization.OtlpSerialization
        const body = serialization.traces(sampleTracesData)
        expect(body.contentType).toBe("application/json")
      }).pipe(Effect.provide(OtlpSerialization.layerJson)))

    it.effect("protobuf serializer returns HttpBody with protobuf content type", () =>
      Effect.gen(function*() {
        const serialization = yield* OtlpSerialization.OtlpSerialization
        const body = serialization.traces(sampleTracesData)
        expect(body.contentType).toBe("application/x-protobuf")
      }).pipe(Effect.provide(OtlpSerialization.layerProtobuf)))
  })
})
