// The layouts of the well-known types, written with the same messages as any
// schema, so that they are merged, read as groups, and checked like them.

import * as DateTime from "../../DateTime.ts"
import * as Duration_ from "../../Duration.ts"
import type { Converted, Message, MessageType, Scalar, Slot } from "./layout.ts"
import { addSlot, finishMessage, makeMessage, scalar, WRAPPED } from "./layout.ts"
import * as Wire from "./wire.ts"

// The layouts are built by calls, without statements or property reads at the
// top level, so that a bundle can leave out those it does not use.

const messageLayout = (name: string, shape: Message["shape"], slots: ReadonlyArray<Slot>): Message => {
  const message = makeMessage(name, shape, { synthetic: true })
  for (const slot of slots) {
    message.order.push(slot.key)
    addSlot(message, slot)
  }
  return finishMessage(message)
}

const messageOf = (name: string, shape: Message["shape"], slots: ReadonlyArray<Slot>): MessageType => {
  return { _tag: "Message", wireType: Wire.WIRE_LEN, message: messageLayout(name, shape, slots) }
}

// -----------------------------------------------------------------------------
// Timestamp and Duration
// -----------------------------------------------------------------------------

interface Time {
  seconds: bigint
  nanos: number
}

// `message { int64 seconds = 1; int32 nanos = 2; }`, the shape of both
// `google.protobuf.Timestamp` and `google.protobuf.Duration`.
const timeLayout = (name: string): Message => {
  return messageLayout(name, "struct", [
    {
      _tag: "Singular",
      key: "seconds",
      guarded: false,
      number: 1,
      type: scalar("int64"),
      absent: "zero",
      delimited: false
    },
    {
      _tag: "Singular",
      key: "nanos",
      guarded: false,
      number: 2,
      type: scalar("int32"),
      absent: "zero",
      delimited: false
    }
  ])
}

// The range of `google.protobuf.Timestamp`, 0001-01-01T00:00:00Z through
// 9999-12-31T23:59:59.999999999Z.
const MIN_TIMESTAMP_SECONDS = -62_135_596_800
const MAX_TIMESTAMP_SECONDS = 253_402_300_799
// The range of `google.protobuf.Duration`, about 10,000 years.
const MAX_DURATION_SECONDS = BigInt(315_576_000_000)
const MAX_NANOS = 999_999_999
const NANOS_PER_SECOND = BigInt(1_000_000_000)
const NANOS_PER_MILLI = BigInt(1_000_000)
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

const fromMillis = (millis: number, input: unknown): Time => {
  if (!Number.isFinite(millis)) throw new Wire.WireError("expected a valid timestamp", input)
  const seconds = Math.floor(millis / 1000)
  if (seconds < MIN_TIMESTAMP_SECONDS || seconds > MAX_TIMESTAMP_SECONDS) {
    throw new Wire.WireError("timestamp out of range", input)
  }
  return { seconds: BigInt(seconds), nanos: (millis - seconds * 1000) * 1_000_000 }
}

const invalidTimestamp = ({ nanos, seconds }: Time): string | undefined => {
  return seconds >= MIN_TIMESTAMP_SECONDS && seconds <= MAX_TIMESTAMP_SECONDS && nanos >= 0 && nanos <= MAX_NANOS
    ? undefined
    : "timestamp out of range"
}

// `DateTime.Utc` has millisecond precision.
const toMillis = ({ nanos, seconds }: Time): number => {
  return Number(seconds) * 1000 + Math.floor(nanos / 1_000_000)
}

/**
 * `google.protobuf.Timestamp` as a `DateTime.Utc`.
 *
 * @internal
 */
export const Timestamp: Converted = {
  _tag: "Converted",
  wireType: Wire.WIRE_LEN,
  message: timeLayout("google.protobuf.Timestamp"),
  toMessage: (value) =>
    fromMillis(DateTime.isDateTime(value) && DateTime.isUtc(value) ? DateTime.toEpochMillis(value) : NaN, value),
  invalid: invalidTimestamp,
  fromMessage: (fields) => DateTime.makeUnsafe(toMillis(fields))
}

/**
 * `google.protobuf.Duration` as a `Duration`.
 *
 * @internal
 */
export const Duration: Converted = {
  _tag: "Converted",
  wireType: Wire.WIRE_LEN,
  message: timeLayout("google.protobuf.Duration"),
  toMessage: (value): Time => {
    if (!Duration_.isDuration(value) || !Duration_.isFinite(value)) {
      throw new Wire.WireError("expected a finite duration", value)
    }
    const total = Duration_.toNanosUnsafe(value)
    const seconds = total / NANOS_PER_SECOND
    if (seconds > MAX_DURATION_SECONDS || seconds < -MAX_DURATION_SECONDS) {
      throw new Wire.WireError("duration out of range", value)
    }
    return { seconds, nanos: Number(total - seconds * NANOS_PER_SECOND) }
  },
  invalid: ({ nanos, seconds }: Time) =>
    seconds <= MAX_DURATION_SECONDS && seconds >= -MAX_DURATION_SECONDS && nanos <= MAX_NANOS &&
      nanos >= -MAX_NANOS && (seconds === Wire.BIGINT_ZERO || nanos === 0 || (seconds < 0) === (nanos < 0))
      ? undefined
      : "duration out of range",
  fromMessage: ({ nanos, seconds }: Time) => {
    const total = seconds * NANOS_PER_SECOND + BigInt(nanos)
    // The millisecond representation when it is exact.
    return total % NANOS_PER_MILLI === Wire.BIGINT_ZERO && total <= MAX_SAFE && total >= -MAX_SAFE
      ? Duration_.millis(Number(total / NANOS_PER_MILLI))
      : Duration_.nanos(total)
  }
}

// -----------------------------------------------------------------------------
// wrappers and FieldMask
// -----------------------------------------------------------------------------

// A wrapper message holds its value in field 1, and decodes to the value
// itself.
const wrapper = (name: string, type: Scalar): MessageType => {
  return messageOf(name, "wrapper", [{
    _tag: "Singular",
    key: WRAPPED,
    guarded: false,
    number: 1,
    type,
    absent: "zero",
    delimited: false
  }])
}

/** @internal */
export const StringValue: MessageType = wrapper("google.protobuf.StringValue", scalar("string"))
/** @internal */
export const BoolValue: MessageType = wrapper("google.protobuf.BoolValue", scalar("bool"))
/** @internal */
export const BytesValue: MessageType = wrapper("google.protobuf.BytesValue", scalar("bytes"))
/** @internal */
export const DoubleValue: MessageType = wrapper("google.protobuf.DoubleValue", scalar("double"))
/** @internal */
export const FloatValue: MessageType = wrapper("google.protobuf.FloatValue", scalar("float"))
/** @internal */
export const Int32Value: MessageType = wrapper("google.protobuf.Int32Value", scalar("int32"))
/** @internal */
export const UInt32Value: MessageType = wrapper("google.protobuf.UInt32Value", scalar("uint32"))
/** @internal */
export const Int64Value: MessageType = wrapper("google.protobuf.Int64Value", scalar("int64"))
/** @internal */
export const UInt64Value: MessageType = wrapper("google.protobuf.UInt64Value", scalar("uint64"))

/**
 * `google.protobuf.FieldMask` as its paths.
 *
 * @internal
 */
export const FieldMask: MessageType = messageOf("google.protobuf.FieldMask", "wrapper", [{
  _tag: "Repeated",
  key: WRAPPED,
  guarded: false,
  number: 1,
  element: scalar("string"),
  absent: "zero",
  packed: false,
  delimited: false
}])
