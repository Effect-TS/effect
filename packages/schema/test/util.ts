import { pipe } from "@fp-ts/data/Function"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import { format, stringify } from "@fp-ts/schema/formatter/Tree"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

const options: D.DecodeOptions = { isUnexpectedAllowed: false, allErrors: false }

export const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  fc.assert(fc.property(arbitrary.arbitrary(fc), (a) => {
    if (!guard.is(a)) {
      return false
    }
    const roundtrip = pipe(a, E.encode(schema, options), I.flatMap(D.decode(schema, options)))
    if (DE.isFailure(roundtrip)) {
      return false
    }
    return guard.is(roundtrip.right)
  }))
}

export const expectDecodingSuccess = <A>(schema: Schema<A>, u: unknown, a: A = u as any) => {
  const t = D.decode(schema, options)(u)
  expect(T.isRight(t)).toEqual(true)
  expect(t).toEqual(T.right(a))
}

export const expectDecodingFailure = <A>(
  schema: Schema<A>,
  u: unknown,
  message: string,
  options?: D.DecodeOptions
) => {
  const t = pipe(D.decode(schema, options)(u), T.mapLeft(formatAll))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectDecodingWarning = <A>(
  schema: Schema<A>,
  u: unknown,
  a: A,
  message: string,
  options?: D.DecodeOptions
) => {
  const t = pipe(D.decode(schema, options)(u), T.mapLeft(formatAll))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}

export const expectEncodingSuccess = <A>(schema: Schema<A>, a: A, o: unknown) => {
  const t = E.encode(schema, options)(a)
  expect(T.isRight(t)).toEqual(true)
  expect(t).toStrictEqual(T.right(o))
}

export const expectEncodingFailure = <A>(
  schema: Schema<A>,
  a: A,
  message: string,
  options?: D.DecodeOptions
) => {
  const t = pipe(E.encode(schema, options)(a), T.mapLeft(formatAll))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectEncodingWarning = <A>(
  schema: Schema<A>,
  a: A,
  o: unknown,
  message: string,
  options?: D.DecodeOptions
) => {
  const t = pipe(E.encode(schema, options)(a), T.mapLeft(formatAll))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, o))
}

const formatAll = (errors: NonEmptyReadonlyArray<DE.DecodeError>): string => {
  return pipe(errors, RA.map(formatDecodeError), RA.join(", "))
}

const formatDecodeError = (e: DE.DecodeError): string => {
  switch (e._tag) {
    case "Meta":
      return `${stringify(e.actual)} did not satisfy ${stringify(e.meta)}`
    case "Type":
      return `${stringify(e.actual)} did not satisfy is(${e.expected})`
    case "Refinement":
      return `${stringify(e.actual)} did not satisfy refinement(${stringify(e.meta)})`
    case "Transform":
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

export const expectFailureTree = <A>(schema: Schema<A>, u: unknown, message: string) => {
  const t = pipe(D.decode(schema, options)(u), T.mapLeft(format))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectWarningTree = <A>(schema: Schema<A>, u: unknown, message: string, a: A) => {
  const t = pipe(D.decode(schema, options)(u), T.mapLeft(format))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}
