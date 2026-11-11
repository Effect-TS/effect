/**
 * OTLP Protobuf encoding for traces, metrics, and logs.
 *
 * Implements the protobuf wire format according to:
 * https://github.com/open-telemetry/opentelemetry-proto
 */

import * as ProtobufWriter from "../../protobuf/ProtobufWriter.ts"
import type { AnyValue, KeyValue, Resource } from "../OtlpResource.ts"
import type { ResourceSpan, ScopeSpan, TraceData } from "../OtlpTracer.ts"

type Writer = ProtobufWriter.ProtobufWriter

const WIRE_VARINT = ProtobufWriter.WireType.Varint
const WIRE_I64 = ProtobufWriter.WireType.I64
const WIRE_LEN = ProtobufWriter.WireType.Len
const WIRE_I32 = ProtobufWriter.WireType.I32

// Field writers

// A 64-bit integer for the writer. Safe integers are written as they are, and
// everything else goes through `BigInt`, which throws for non-integers.
const int64 = (value: string | number | bigint): bigint | number =>
  typeof value === "number" && Number.isSafeInteger(value) ? value : BigInt(value)

// Negative numbers are written as ten-byte varints, as for `int64`.
const varintField = (w: Writer, number: number, value: string | number | bigint): void => {
  w.tag(number, WIRE_VARINT)
  if (typeof value === "number" && value >>> 0 === value) w.uint32(value)
  else w.int64(int64(value))
}

const boolField = (w: Writer, number: number, value: boolean): void => {
  w.tag(number, WIRE_VARINT)
  w.uint32(value ? 1 : 0)
}

const fixed64Field = (w: Writer, number: number, value: string | number | bigint): void => {
  w.tag(number, WIRE_I64)
  w.fixed64(int64(value))
}

const fixed32Field = (w: Writer, number: number, value: number): void => {
  w.tag(number, WIRE_I32)
  w.fixed32(value)
}

const doubleField = (w: Writer, number: number, value: number): void => {
  w.tag(number, WIRE_I64)
  w.double(value)
}

const stringField = (w: Writer, number: number, value: string): void => {
  w.tag(number, WIRE_LEN)
  w.string(value)
}

// Empty strings are omitted.
const optionalStringField = (w: Writer, number: number, value: string | undefined): void => {
  if (value !== undefined && value !== "") stringField(w, number, value)
}

// Trace and span ids are 16 and 8 bytes, parsed into these arrays.
const traceIdScratch = new Uint8Array(16)
const spanIdScratch = new Uint8Array(8)

// The bytes of a hex string, such as a trace or span id. Each pair of
// characters is parsed with `parseInt`, and a trailing odd character is
// ignored.
const hexField = (w: Writer, number: number, hex: string): void => {
  const length = hex.length >>> 1
  const bytes = length === 16 ? traceIdScratch : length === 8 ? spanIdScratch : new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  w.tag(number, WIRE_LEN)
  w.bytes(bytes)
}

const messageField = <A>(w: Writer, number: number, write: (w: Writer, value: A) => void, value: A): void => {
  w.tag(number, WIRE_LEN)
  const start = w.beginDelimited()
  write(w, value)
  w.endDelimited(start)
}

const repeatedField = <A>(
  w: Writer,
  number: number,
  write: (w: Writer, value: A) => void,
  values: ReadonlyArray<A>
): void => {
  for (let i = 0; i < values.length; i++) messageField(w, number, write, values[i])
}

const encoder = <A>(write: (w: Writer, value: A) => void) => (value: A): Uint8Array => {
  const w = new ProtobufWriter.ProtobufWriter()
  write(w, value)
  return w.finish()
}

// Common types (opentelemetry.proto.common.v1)

/**
 * Encodes an AnyValue message.
 *
 * message AnyValue {
 *   oneof value {
 *     string string_value = 1;
 *     bool bool_value = 2;
 *     int64 int_value = 3;
 *     double double_value = 4;
 *     ArrayValue array_value = 5;
 *     KeyValueList kvlist_value = 6;
 *     bytes bytes_value = 7;
 *   }
 * }
 */
const writeAnyValue = (w: Writer, value: AnyValue): void => {
  if (value.stringValue !== undefined && value.stringValue !== null) {
    stringField(w, 1, value.stringValue)
  } else if (value.boolValue !== undefined && value.boolValue !== null) {
    boolField(w, 2, value.boolValue)
  } else if (value.intValue !== undefined && value.intValue !== null) {
    varintField(w, 3, value.intValue)
  } else if (value.doubleValue !== undefined && value.doubleValue !== null) {
    doubleField(w, 4, value.doubleValue)
  } else if (value.arrayValue !== undefined) {
    messageField(w, 5, writeArrayValue, value.arrayValue)
  } else if (value.kvlistValue !== undefined) {
    messageField(w, 6, writeKeyValueList, value.kvlistValue)
  } else if (value.bytesValue !== undefined) {
    w.tag(7, WIRE_LEN)
    w.bytes(value.bytesValue)
  }
}

/**
 * Encodes an ArrayValue message.
 *
 * message ArrayValue {
 *   repeated AnyValue values = 1;
 * }
 */
const writeArrayValue = (w: Writer, value: { readonly values: ReadonlyArray<AnyValue> }): void =>
  repeatedField(w, 1, writeAnyValue, value.values)

/**
 * Encodes a KeyValueList message.
 *
 * message KeyValueList {
 *   repeated KeyValue values = 1;
 * }
 */
const writeKeyValueList = (w: Writer, value: { readonly values: ReadonlyArray<KeyValue> }): void =>
  repeatedField(w, 1, writeKeyValue, value.values)

/**
 * Encodes a KeyValue message.
 *
 * message KeyValue {
 *   string key = 1;
 *   AnyValue value = 2;
 * }
 */
const writeKeyValue = (w: Writer, kv: KeyValue): void => {
  stringField(w, 1, kv.key)
  messageField(w, 2, writeAnyValue, kv.value)
}

/**
 * Encodes an InstrumentationScope message.
 *
 * message InstrumentationScope {
 *   string name = 1;
 *   string version = 2;
 *   repeated KeyValue attributes = 3;
 *   uint32 dropped_attributes_count = 4;
 * }
 */
const writeInstrumentationScope = (w: Writer, scope: {
  readonly name: string
  readonly version?: string
  readonly attributes?: ReadonlyArray<KeyValue>
  readonly droppedAttributesCount?: number
}): void => {
  stringField(w, 1, scope.name)
  optionalStringField(w, 2, scope.version)
  if (scope.attributes) repeatedField(w, 3, writeKeyValue, scope.attributes)
  if (scope.droppedAttributesCount) varintField(w, 4, scope.droppedAttributesCount)
}

// Resource types (opentelemetry.proto.resource.v1)

/**
 * Encodes a Resource message.
 *
 * message Resource {
 *   repeated KeyValue attributes = 1;
 *   uint32 dropped_attributes_count = 2;
 * }
 */
const writeResource = (w: Writer, resource: Resource): void => {
  repeatedField(w, 1, writeKeyValue, resource.attributes)
  if (resource.droppedAttributesCount > 0) varintField(w, 2, resource.droppedAttributesCount)
}

/**
 * Encodes a Status message.
 *
 * message Status {
 *   string message = 2;
 *   StatusCode code = 3;
 * }
 */
const writeStatus = (w: Writer, status: {
  readonly code: number
  readonly message?: string
}): void => {
  optionalStringField(w, 2, status.message)
  varintField(w, 3, status.code)
}

/**
 * Encodes an Event message.
 *
 * message Event {
 *   fixed64 time_unix_nano = 1;
 *   string name = 2;
 *   repeated KeyValue attributes = 3;
 *   uint32 dropped_attributes_count = 4;
 * }
 */
const writeEvent = (w: Writer, event: {
  readonly timeUnixNano: string
  readonly name: string
  readonly attributes: ReadonlyArray<KeyValue>
  readonly droppedAttributesCount: number
}): void => {
  fixed64Field(w, 1, event.timeUnixNano)
  stringField(w, 2, event.name)
  repeatedField(w, 3, writeKeyValue, event.attributes)
  if (event.droppedAttributesCount > 0) varintField(w, 4, event.droppedAttributesCount)
}

/**
 * Encodes a Link message.
 *
 * message Link {
 *   bytes trace_id = 1;
 *   bytes span_id = 2;
 *   string trace_state = 3;
 *   repeated KeyValue attributes = 4;
 *   uint32 dropped_attributes_count = 5;
 *   fixed32 flags = 6;
 * }
 */
const writeLink = (w: Writer, link: {
  readonly traceId: string
  readonly spanId: string
  readonly traceState?: string
  readonly attributes: ReadonlyArray<KeyValue>
  readonly droppedAttributesCount: number
  readonly flags?: number
}): void => {
  hexField(w, 1, link.traceId)
  hexField(w, 2, link.spanId)
  optionalStringField(w, 3, link.traceState)
  repeatedField(w, 4, writeKeyValue, link.attributes)
  if (link.droppedAttributesCount > 0) varintField(w, 5, link.droppedAttributesCount)
  if (link.flags !== undefined) fixed32Field(w, 6, link.flags)
}

/**
 * Encodes a Span message.
 *
 * message Span {
 *   bytes trace_id = 1;
 *   bytes span_id = 2;
 *   string trace_state = 3;
 *   bytes parent_span_id = 4;
 *   string name = 5;
 *   SpanKind kind = 6;
 *   fixed64 start_time_unix_nano = 7;
 *   fixed64 end_time_unix_nano = 8;
 *   repeated KeyValue attributes = 9;
 *   uint32 dropped_attributes_count = 10;
 *   repeated Event events = 11;
 *   uint32 dropped_events_count = 12;
 *   repeated Link links = 13;
 *   uint32 dropped_links_count = 14;
 *   Status status = 15;
 *   fixed32 flags = 16;
 * }
 */
const writeSpan = (w: Writer, span: {
  readonly traceId: string
  readonly spanId: string
  readonly traceState?: string
  readonly parentSpanId?: string | undefined
  readonly name: string
  readonly kind: number
  readonly startTimeUnixNano: string
  readonly endTimeUnixNano: string
  readonly attributes: ReadonlyArray<KeyValue>
  readonly droppedAttributesCount: number
  readonly events: ReadonlyArray<Parameters<typeof writeEvent>[1]>
  readonly droppedEventsCount: number
  readonly links: ReadonlyArray<Parameters<typeof writeLink>[1]>
  readonly droppedLinksCount: number
  readonly status: Parameters<typeof writeStatus>[1]
  readonly flags?: number
}): void => {
  hexField(w, 1, span.traceId)
  hexField(w, 2, span.spanId)
  optionalStringField(w, 3, span.traceState)
  if (span.parentSpanId !== undefined) hexField(w, 4, span.parentSpanId)
  stringField(w, 5, span.name)
  varintField(w, 6, span.kind)
  fixed64Field(w, 7, span.startTimeUnixNano)
  fixed64Field(w, 8, span.endTimeUnixNano)
  repeatedField(w, 9, writeKeyValue, span.attributes)
  if (span.droppedAttributesCount > 0) varintField(w, 10, span.droppedAttributesCount)
  repeatedField(w, 11, writeEvent, span.events)
  if (span.droppedEventsCount > 0) varintField(w, 12, span.droppedEventsCount)
  repeatedField(w, 13, writeLink, span.links)
  if (span.droppedLinksCount > 0) varintField(w, 14, span.droppedLinksCount)
  messageField(w, 15, writeStatus, span.status)
  if (span.flags !== undefined) fixed32Field(w, 16, span.flags)
}

/**
 * Encodes a ScopeSpans message.
 *
 * message ScopeSpans {
 *   InstrumentationScope scope = 1;
 *   repeated Span spans = 2;
 *   string schema_url = 3;
 * }
 */
const writeScopeSpans = (w: Writer, scopeSpans: ScopeSpan): void => {
  messageField(w, 1, writeInstrumentationScope, scopeSpans.scope)
  repeatedField(w, 2, writeSpan, scopeSpans.spans)
  optionalStringField(w, 3, scopeSpans.schemaUrl)
}

/**
 * Encodes a ResourceSpans message.
 *
 * message ResourceSpans {
 *   Resource resource = 1;
 *   repeated ScopeSpans scope_spans = 2;
 *   string schema_url = 3;
 * }
 */
const writeResourceSpans = (w: Writer, resourceSpans: ResourceSpan): void => {
  messageField(w, 1, writeResource, resourceSpans.resource)
  repeatedField(w, 2, writeScopeSpans, resourceSpans.scopeSpans)
  optionalStringField(w, 3, resourceSpans.schemaUrl)
}

/**
 * Encodes a TracesData message (top-level export request).
 *
 * message TracesData {
 *   repeated ResourceSpans resource_spans = 1;
 * }
 *
 * @internal
 */
export const encodeTracesData = encoder((w, tracesData: TraceData): void =>
  repeatedField(w, 1, writeResourceSpans, tracesData.resourceSpans)
)

/**
 * Encodes a NumberDataPoint message.
 *
 * message NumberDataPoint {
 *   repeated KeyValue attributes = 7;
 *   fixed64 start_time_unix_nano = 2;
 *   fixed64 time_unix_nano = 3;
 *   oneof value {
 *     double as_double = 4;
 *     sfixed64 as_int = 6;
 *   }
 *   repeated Exemplar exemplars = 5;
 *   uint32 flags = 8;
 * }
 */
const writeNumberDataPoint = (w: Writer, point: {
  readonly attributes: ReadonlyArray<KeyValue>
  readonly startTimeUnixNano?: string | undefined
  readonly timeUnixNano: string
  readonly asDouble?: number | undefined
  readonly asInt?: string | number | bigint | undefined
  readonly flags?: number | undefined
}): void => {
  // An absent start time is omitted.
  if (point.startTimeUnixNano !== undefined) fixed64Field(w, 2, point.startTimeUnixNano)
  fixed64Field(w, 3, point.timeUnixNano)
  if (point.asDouble !== undefined) doubleField(w, 4, point.asDouble)
  if (point.asInt !== undefined) fixed64Field(w, 6, point.asInt)
  repeatedField(w, 7, writeKeyValue, point.attributes)
  if (point.flags !== undefined) varintField(w, 8, point.flags)
}

/**
 * Encodes a HistogramDataPoint message.
 *
 * message HistogramDataPoint {
 *   repeated KeyValue attributes = 9;
 *   fixed64 start_time_unix_nano = 2;
 *   fixed64 time_unix_nano = 3;
 *   fixed64 count = 4;
 *   optional double sum = 5;
 *   repeated fixed64 bucket_counts = 6;
 *   repeated double explicit_bounds = 7;
 *   optional double min = 11;
 *   optional double max = 12;
 *   uint32 flags = 10;
 * }
 */
const writeHistogramDataPoint = (w: Writer, point: {
  readonly attributes: ReadonlyArray<KeyValue>
  readonly startTimeUnixNano?: string | undefined
  readonly timeUnixNano: string
  readonly count: string | number | bigint
  readonly sum?: number | undefined
  readonly bucketCounts: ReadonlyArray<string | number | bigint>
  readonly explicitBounds: ReadonlyArray<number>
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly flags?: number | undefined
}): void => {
  // An absent start time is omitted.
  if (point.startTimeUnixNano !== undefined) fixed64Field(w, 2, point.startTimeUnixNano)
  fixed64Field(w, 3, point.timeUnixNano)
  fixed64Field(w, 4, point.count)
  if (point.sum !== undefined) doubleField(w, 5, point.sum)
  // Bucket counts and bounds are written unpacked, one field per value
  for (let i = 0; i < point.bucketCounts.length; i++) fixed64Field(w, 6, point.bucketCounts[i])
  for (let i = 0; i < point.explicitBounds.length; i++) doubleField(w, 7, point.explicitBounds[i])
  repeatedField(w, 9, writeKeyValue, point.attributes)
  if (point.flags !== undefined) varintField(w, 10, point.flags)
  if (point.min !== undefined) doubleField(w, 11, point.min)
  if (point.max !== undefined) doubleField(w, 12, point.max)
}

/**
 * Encodes a Gauge message.
 *
 * message Gauge {
 *   repeated NumberDataPoint data_points = 1;
 * }
 */
const writeGauge = (w: Writer, gauge: {
  readonly dataPoints: ReadonlyArray<Parameters<typeof writeNumberDataPoint>[1]>
}): void => repeatedField(w, 1, writeNumberDataPoint, gauge.dataPoints)

/**
 * Encodes a Sum message.
 *
 * message Sum {
 *   repeated NumberDataPoint data_points = 1;
 *   AggregationTemporality aggregation_temporality = 2;
 *   bool is_monotonic = 3;
 * }
 */
const writeSum = (w: Writer, sum: {
  readonly dataPoints: ReadonlyArray<Parameters<typeof writeNumberDataPoint>[1]>
  readonly aggregationTemporality: number
  readonly isMonotonic: boolean
}): void => {
  repeatedField(w, 1, writeNumberDataPoint, sum.dataPoints)
  varintField(w, 2, sum.aggregationTemporality)
  boolField(w, 3, sum.isMonotonic)
}

/**
 * Encodes a Histogram message.
 *
 * message Histogram {
 *   repeated HistogramDataPoint data_points = 1;
 *   AggregationTemporality aggregation_temporality = 2;
 * }
 */
const writeHistogram = (w: Writer, histogram: {
  readonly dataPoints: ReadonlyArray<Parameters<typeof writeHistogramDataPoint>[1]>
  readonly aggregationTemporality: number
}): void => {
  repeatedField(w, 1, writeHistogramDataPoint, histogram.dataPoints)
  varintField(w, 2, histogram.aggregationTemporality)
}

const writeValueAtQuantile = (w: Writer, q: { readonly quantile: number; readonly value: number }): void => {
  doubleField(w, 1, q.quantile)
  doubleField(w, 2, q.value)
}

/**
 * Encodes a SummaryDataPoint message.
 *
 * message SummaryDataPoint {
 *   repeated KeyValue attributes = 7;
 *   fixed64 start_time_unix_nano = 2;
 *   fixed64 time_unix_nano = 3;
 *   fixed64 count = 4;
 *   double sum = 5;
 *   repeated ValueAtQuantile quantile_values = 6;
 *   uint32 flags = 8;
 * }
 *
 * message ValueAtQuantile {
 *   double quantile = 1;
 *   double value = 2;
 * }
 */
const writeSummaryDataPoint = (w: Writer, point: {
  readonly attributes: ReadonlyArray<KeyValue>
  readonly startTimeUnixNano?: string | undefined
  readonly timeUnixNano: string
  readonly count: string | number | bigint
  readonly sum: number
  readonly quantileValues: ReadonlyArray<{ readonly quantile: number; readonly value: number }>
  readonly flags?: number | undefined
}): void => {
  // An absent start time is omitted.
  if (point.startTimeUnixNano !== undefined) fixed64Field(w, 2, point.startTimeUnixNano)
  fixed64Field(w, 3, point.timeUnixNano)
  fixed64Field(w, 4, point.count)
  doubleField(w, 5, point.sum)
  repeatedField(w, 6, writeValueAtQuantile, point.quantileValues)
  repeatedField(w, 7, writeKeyValue, point.attributes)
  if (point.flags !== undefined) varintField(w, 8, point.flags)
}

/**
 * Encodes a Summary message.
 *
 * message Summary {
 *   repeated SummaryDataPoint data_points = 1;
 * }
 */
const writeSummary = (w: Writer, summary: {
  readonly dataPoints: ReadonlyArray<Parameters<typeof writeSummaryDataPoint>[1]>
}): void => repeatedField(w, 1, writeSummaryDataPoint, summary.dataPoints)

/**
 * Encodes a Metric message.
 *
 * message Metric {
 *   string name = 1;
 *   string description = 2;
 *   string unit = 3;
 *   oneof data {
 *     Gauge gauge = 5;
 *     Sum sum = 7;
 *     Histogram histogram = 9;
 *     ExponentialHistogram exponential_histogram = 10;
 *     Summary summary = 11;
 *   }
 * }
 */
const writeMetric = (w: Writer, metric: {
  readonly name: string
  readonly description?: string | undefined
  readonly unit?: string | undefined
  readonly gauge?: Parameters<typeof writeGauge>[1] | undefined
  readonly sum?: Parameters<typeof writeSum>[1] | undefined
  readonly histogram?: Parameters<typeof writeHistogram>[1] | undefined
  readonly summary?: Parameters<typeof writeSummary>[1] | undefined
}): void => {
  stringField(w, 1, metric.name)
  optionalStringField(w, 2, metric.description)
  optionalStringField(w, 3, metric.unit)
  if (metric.gauge !== undefined) messageField(w, 5, writeGauge, metric.gauge)
  if (metric.sum !== undefined) messageField(w, 7, writeSum, metric.sum)
  if (metric.histogram !== undefined) messageField(w, 9, writeHistogram, metric.histogram)
  if (metric.summary !== undefined) messageField(w, 11, writeSummary, metric.summary)
}

/**
 * Encodes a ScopeMetrics message.
 *
 * message ScopeMetrics {
 *   InstrumentationScope scope = 1;
 *   repeated Metric metrics = 2;
 *   string schema_url = 3;
 * }
 */
const writeScopeMetrics = (w: Writer, scopeMetrics: {
  readonly scope: { readonly name: string; readonly version?: string }
  readonly metrics: ReadonlyArray<Parameters<typeof writeMetric>[1]>
  readonly schemaUrl?: string
}): void => {
  messageField(w, 1, writeInstrumentationScope, scopeMetrics.scope)
  repeatedField(w, 2, writeMetric, scopeMetrics.metrics)
  optionalStringField(w, 3, scopeMetrics.schemaUrl)
}

/**
 * Encodes a ResourceMetrics message.
 *
 * message ResourceMetrics {
 *   Resource resource = 1;
 *   repeated ScopeMetrics scope_metrics = 2;
 *   string schema_url = 3;
 * }
 */
const writeResourceMetrics = (w: Writer, resourceMetrics: {
  readonly resource: Resource
  readonly scopeMetrics: ReadonlyArray<Parameters<typeof writeScopeMetrics>[1]>
  readonly schemaUrl?: string
}): void => {
  messageField(w, 1, writeResource, resourceMetrics.resource)
  repeatedField(w, 2, writeScopeMetrics, resourceMetrics.scopeMetrics)
  optionalStringField(w, 3, resourceMetrics.schemaUrl)
}

/**
 * Encodes a MetricsData message (top-level export request).
 *
 * message MetricsData {
 *   repeated ResourceMetrics resource_metrics = 1;
 * }
 *
 * @internal
 */
export const encodeMetricsData = encoder((w, metricsData: {
  readonly resourceMetrics: ReadonlyArray<Parameters<typeof writeResourceMetrics>[1]>
}): void => repeatedField(w, 1, writeResourceMetrics, metricsData.resourceMetrics))

/**
 * Encodes a LogRecord message.
 *
 * message LogRecord {
 *   fixed64 time_unix_nano = 1;
 *   fixed64 observed_time_unix_nano = 11;
 *   SeverityNumber severity_number = 2;
 *   string severity_text = 3;
 *   AnyValue body = 5;
 *   repeated KeyValue attributes = 6;
 *   uint32 dropped_attributes_count = 7;
 *   fixed32 flags = 8;
 *   bytes trace_id = 9;
 *   bytes span_id = 10;
 * }
 */
const writeLogRecord = (w: Writer, record: {
  readonly timeUnixNano: string
  readonly observedTimeUnixNano?: string | undefined
  readonly severityNumber?: number | undefined
  readonly severityText?: string | undefined
  readonly body?: AnyValue | undefined
  readonly attributes: ReadonlyArray<KeyValue>
  readonly droppedAttributesCount?: number | undefined
  readonly flags?: number | undefined
  readonly traceId?: string | undefined
  readonly spanId?: string | undefined
}): void => {
  fixed64Field(w, 1, record.timeUnixNano)
  if (record.severityNumber !== undefined) varintField(w, 2, record.severityNumber)
  optionalStringField(w, 3, record.severityText)
  if (record.body !== undefined) messageField(w, 5, writeAnyValue, record.body)
  repeatedField(w, 6, writeKeyValue, record.attributes)
  if (record.droppedAttributesCount !== undefined && record.droppedAttributesCount > 0) {
    varintField(w, 7, record.droppedAttributesCount)
  }
  if (record.flags !== undefined) fixed32Field(w, 8, record.flags)
  if (record.traceId !== undefined && record.traceId !== "") hexField(w, 9, record.traceId)
  if (record.spanId !== undefined && record.spanId !== "") hexField(w, 10, record.spanId)
  if (record.observedTimeUnixNano !== undefined) fixed64Field(w, 11, record.observedTimeUnixNano)
}

/**
 * Encodes a ScopeLogs message.
 *
 * message ScopeLogs {
 *   InstrumentationScope scope = 1;
 *   repeated LogRecord log_records = 2;
 *   string schema_url = 3;
 * }
 */
const writeScopeLogs = (w: Writer, scopeLogs: {
  readonly scope: { readonly name: string; readonly version?: string }
  readonly logRecords: ReadonlyArray<Parameters<typeof writeLogRecord>[1]>
  readonly schemaUrl?: string
}): void => {
  messageField(w, 1, writeInstrumentationScope, scopeLogs.scope)
  repeatedField(w, 2, writeLogRecord, scopeLogs.logRecords)
  optionalStringField(w, 3, scopeLogs.schemaUrl)
}

/**
 * Encodes a ResourceLogs message.
 *
 * message ResourceLogs {
 *   Resource resource = 1;
 *   repeated ScopeLogs scope_logs = 2;
 *   string schema_url = 3;
 * }
 */
const writeResourceLogs = (w: Writer, resourceLogs: {
  readonly resource: Resource
  readonly scopeLogs: ReadonlyArray<Parameters<typeof writeScopeLogs>[1]>
  readonly schemaUrl?: string
}): void => {
  messageField(w, 1, writeResource, resourceLogs.resource)
  repeatedField(w, 2, writeScopeLogs, resourceLogs.scopeLogs)
  optionalStringField(w, 3, resourceLogs.schemaUrl)
}

/**
 * Encodes a LogsData message (top-level export request).
 *
 * message LogsData {
 *   repeated ResourceLogs resource_logs = 1;
 * }
 *
 * @internal
 */
export const encodeLogsData = encoder((w, logsData: {
  readonly resourceLogs: ReadonlyArray<Parameters<typeof writeResourceLogs>[1]>
}): void => repeatedField(w, 1, writeResourceLogs, logsData.resourceLogs))
