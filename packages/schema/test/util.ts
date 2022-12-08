import { pipe } from "@fp-ts/data/Function"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import type * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as UE from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import type { Schema } from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  const decoder = D.decoderFor(schema)
  const encoder = UE.encoderFor(schema)
  fc.assert(fc.property(arbitrary.arbitrary(fc), (a) => {
    return guard.is(a) && !D.isFailure(decoder.decode(encoder.encode(a)))
  }))
}

export const expectFailure = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string) => {
  const t = pipe(decoder.decode(i), T.mapLeft(formatAll))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectWarning = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string, a: A) => {
  const t = pipe(decoder.decode(i), T.mapLeft(formatAll))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}

const formatAll = (errors: NonEmptyReadonlyArray<DE.DecodeError>): string => {
  return pipe(errors, RA.map(format), RA.join(", "))
}

/**
 * @since 1.0.0
 */
export const format = (e: DE.DecodeError): string => {
  switch (e._tag) {
    case "Custom":
      return `${JSON.stringify(e.actual)} ${JSON.stringify(e.config)}`
    case "LessThan":
      return `${JSON.stringify(e.actual)} did not satisfy LessThan(${e.max})`
    case "LessThanOrEqualTo":
      return `${JSON.stringify(e.actual)} did not satisfy LessThanOrEqualTo(${e.max})`
    case "GreaterThan":
      return `${JSON.stringify(e.actual)} did not satisfy GreaterThan(${e.min})`
    case "GreaterThanOrEqualTo":
      return `${JSON.stringify(e.actual)} did not satisfy GreaterThanOrEqualTo(${e.min})`
    case "MaxLength":
      return `${JSON.stringify(e.actual)} did not satisfy MaxLength(${e.maxLength})`
    case "MinLength":
      return `${JSON.stringify(e.actual)} did not satisfy MinLength(${e.minLength})`
    case "NaN":
      return `did not satisfy not(isNaN)`
    case "NotFinite":
      return `did not satisfy isFinite`
    case "NotType":
      return `${JSON.stringify(e.actual)} did not satisfy is(${e.expected})`
    case "NotEqual":
      return `${JSON.stringify(e.actual)} did not satisfy isEqual(${e.expected})`
    case "Index":
      return `/${e.index} ${pipe(e.errors, RA.map(format), RA.join(", "))}`
    case "Key":
      return `/${String(e.key)} ${pipe(e.errors, RA.map(format), RA.join(", "))}`
    case "UnexpectedKey":
      return `/${String(e.key)} key is unexpected`
    case "UnexpectedIndex":
      return `/${String(e.index)} index is unexpected`
    case "Member":
      return `member ${e.index} ${pipe(e.errors, RA.map(format), RA.join(", "))}`
  }
}
