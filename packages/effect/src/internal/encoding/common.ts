import type * as Encoding from "../../Encoding.js"
import { hasProperty, isString } from "../../Predicate.js"
import type { Mutable } from "../../Types.js"

/** @internal */
export const DecodeExceptionTypeId: Encoding.DecodeExceptionTypeId = Symbol.for(
  "effect/Encoding/errors/Decode"
) as Encoding.DecodeExceptionTypeId

/** @internal */
export const DecodeException = (input: string, message?: string): Encoding.DecodeException => {
  const out: Mutable<Encoding.DecodeException> = {
    _tag: "DecodeException",
    [DecodeExceptionTypeId]: DecodeExceptionTypeId,
    input
  }
  if (isString(message)) {
    out.message = message
  }
  return out
}

/** @internal */
export const isDecodeException = (u: unknown): u is Encoding.DecodeException => hasProperty(u, DecodeExceptionTypeId)

/** @interal */
export const encoder = new TextEncoder()

/** @interal */
export const decoder = new TextDecoder()
