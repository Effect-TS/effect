import type * as OtelApi from "@opentelemetry/api"
import * as Inspectable from "effect/Inspectable"

const bigint1e9 = 1_000_000_000n
export const nanosToHrTime = (timestamp: bigint): OtelApi.HrTime => {
  return [Number(timestamp / bigint1e9), Number(timestamp % bigint1e9)]
}

export const recordToAttributes = (value: Record<string, unknown>): OtelApi.Attributes => {
  return Object.entries(value).reduce((acc, [key, value]) => {
    acc[key] = unknownToAttributeValue(value)
    return acc
  }, {} as OtelApi.Attributes)
}

export const unknownToAttributeValue = (value: unknown): OtelApi.AttributeValue => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  } else if (typeof value === "bigint") {
    return Number(value)
  }
  return Inspectable.toStringUnknown(value)
}
