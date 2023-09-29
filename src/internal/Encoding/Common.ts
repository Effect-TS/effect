import type * as Encoding from "../../Encoding"

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
export const isDecodeException = (u: unknown): u is Encoding.DecodeException =>
  typeof u === "object" && u != null && DecodeExceptionTypeId in u

/** @interal */
export const encoder = new TextEncoder()

/** @interal */
export const decoder = new TextDecoder()
