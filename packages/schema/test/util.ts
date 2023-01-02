import { pipe } from "@fp-ts/data/Function"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import type * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as UE from "@fp-ts/schema/Encoder"
import { format } from "@fp-ts/schema/formatter/Tree"
import * as G from "@fp-ts/schema/Guard"
import type { Schema } from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  const decoder = D.decoderFor(schema)
  const encoder = UE.encoderFor(schema)
  fc.assert(fc.property(arbitrary.arbitrary(fc), (a) => {
    if (!guard.is(a)) {
      return false
    }
    const roundtrip = decoder.decode(encoder.encode(a))
    if (D.isFailure(roundtrip)) {
      return false
    }
    return guard.is(roundtrip.right)
  }))
}

export const expectSuccess = <I, A>(decoder: D.Decoder<I, A>, i: I) => {
  const t = decoder.decode(i)
  expect(T.isRight(t)).toEqual(true)
  expect(t).toEqual(T.right(i))
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
  return pipe(errors, RA.map(formatDecodeError), RA.join(", "))
}

const stringify = (actual: unknown): string => {
  if (typeof actual === "number") {
    return Number.isNaN(actual) ? "NaN" : String(actual)
  }
  return JSON.stringify(actual, (_, value) => typeof value === "function" ? value.name : value)
}

const formatDecodeError = (e: DE.DecodeError): string => {
  switch (e._tag) {
    case "Meta":
      return `${stringify(e.actual)} did not satisfy ${stringify(e.meta)}`
    case "Type":
      return `${stringify(e.actual)} did not satisfy is(${e.expected})`
    case "Refinement":
      return `${stringify(e.actual)} did not satisfy refinement(${stringify(e.meta)})`
    case "Parse":
      return `${stringify(e.actual)} did not satisfy parsing from (${e.from}) to (${e.to})`
    case "Equal":
      return `${stringify(e.actual)} did not satisfy isEqual(${String(e.expected)})`
    case "Enums":
      return `${stringify(e.actual)} did not satisfy isEnum(${stringify(e.enums)})`
    case "Index":
      return `/${e.index} ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
    case "Key":
      return `/${String(e.key)} ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
    case "Missing":
      return `is missing`
    case "Unexpected":
      return `is unexpected`
    case "Member":
      return `member: ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
  }
}

export const expectFailureTree = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string) => {
  const t = pipe(decoder.decode(i), T.mapLeft(format))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectWarningTree = <I, A>(decoder: D.Decoder<I, A>, i: I, message: string, a: A) => {
  const t = pipe(decoder.decode(i), T.mapLeft(format))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}
