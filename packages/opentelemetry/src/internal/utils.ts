import type * as OtelApi from "@opentelemetry/api"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Inspectable from "effect/Inspectable"

const bigint1e9 = 1_000_000_000n

/** @internal */
export const nanosToHrTime = (timestamp: bigint): OtelApi.HrTime => {
  return [Number(timestamp / bigint1e9), Number(timestamp % bigint1e9)]
}

/** @internal */
export const recordToAttributes = (value: Record<string, unknown>): OtelApi.Attributes =>
  Object.entries(value).reduce((acc, [key, value]) => {
    acc[key] = unknownToAttributeValue(value)
    return acc
  }, {} as OtelApi.Attributes)

/** @internal */
export const unknownToAttributeValue = (value: unknown): OtelApi.AttributeValue => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  } else if (typeof value === "bigint") {
    return value.toString()
  }
  return Inspectable.toStringUnknown(value)
}

/** @internal */
export const isNonEmpty = <A>(a: A | ReadonlyArray<A> | undefined): a is A | NonEmptyReadonlyArray<A> =>
  a !== undefined && !(Array.isArray(a) && a.length === 0)
