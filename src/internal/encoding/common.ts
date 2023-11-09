import type * as Encoding from "../../exports/Encoding.js"
import { hasProperty } from "../../exports/Predicate.js"

/** @internal */
export const DecodeExceptionTypeId: Encoding.DecodeExceptionTypeId = Symbol.for(
  "effect/Encoding/errors/Decode"
) as Encoding.DecodeExceptionTypeId

/** @internal */
export const DecodeException = (input: string, message?: string): Encoding.DecodeException => ({
  _tag: "DecodeException",
  [DecodeExceptionTypeId]: DecodeExceptionTypeId,
  input,
  message
})

/** @internal */
export const isDecodeException = (u: unknown): u is Encoding.DecodeException => hasProperty(u, DecodeExceptionTypeId)

/** @interal */
export const encoder = new TextEncoder()

/** @interal */
export const decoder = new TextDecoder()
