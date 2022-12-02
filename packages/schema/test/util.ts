import type { NonEmptyChunk } from "@fp-ts/data/Chunk"
import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import type * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JC from "@fp-ts/schema/JsonCodec"
import type { Schema } from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  const jsonCodec = JC.jsonCodecFor(schema)
  fc.assert(fc.property(arbitrary.arbitrary(fc), (json) => {
    return guard.is(json) && !D.isFailure(jsonCodec.decode(jsonCodec.encode(json)))
  }))
}

export const expectFailure = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string) => {
  expect(pipe(decoder.decode(i), T.mapLeft(formatAll))).toEqual(T.left(message))
}

export const expectWarning = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string, a: A) => {
  expect(pipe(decoder.decode(i), T.mapLeft(formatAll))).toEqual(T.both(message, a))
}

const formatAll = (errors: NonEmptyChunk<DE.DecodeError>): string => {
  return pipe(errors, C.map(format), C.join(", "))
}

/**
 * @since 1.0.0
 */
export const format = (e: DE.DecodeError): string => {
  switch (e._tag) {
    case "Custom":
      return `${JSON.stringify(e.actual)} did not satisfy custom error`
    case "Max":
      return `${JSON.stringify(e.actual)} did not satisfy max(${e.max})`
    case "Min":
      return `${JSON.stringify(e.actual)} did not satisfy min(${e.min})`
    case "MaxLength":
      return `${JSON.stringify(e.actual)} did not satisfy maxLength(${e.maxLength})`
    case "MinLength":
      return `${JSON.stringify(e.actual)} did not satisfy minLength(${e.minLength})`
    case "NaN":
      return `did not satisfy isNot(NaN)`
    case "NoFinite":
      return `did not satisfy isNot(Finite)`
    case "NotType":
      return `${JSON.stringify(e.actual)} did not satisfy is(${e.expected})`
    case "NotEqual":
      return `${JSON.stringify(e.actual)} did not satisfy isEqual(${e.expected})`
    case "Index":
      return `/${e.index} ${pipe(e.errors, C.map(format), C.join(", "))}`
    case "Key":
      return `/${e.key} ${pipe(e.errors, C.map(format), C.join(", "))}`
    case "Member":
      return `member ${e.index} ${pipe(e.errors, C.map(format), C.join(", "))}`
  }
}
