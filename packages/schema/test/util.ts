import { pipe } from "@fp-ts/data/Function"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import { formatActual, formatAST, formatErrors } from "@fp-ts/schema/formatter/Tree"
import * as I from "@fp-ts/schema/internal/common"
import * as PE from "@fp-ts/schema/ParseError"
import * as P from "@fp-ts/schema/Parser"
import type { Schema } from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitrary(schema)
  const is = P.is(schema)
  fc.assert(fc.property(arbitrary(fc), (a) => {
    if (!is(a)) {
      return false
    }
    const roundtrip = pipe(a, P.encode(schema), I.flatMap(P.decode(schema)))
    if (PE.isFailure(roundtrip)) {
      return false
    }
    return is(roundtrip.right)
  }))
}

export const expectDecodingSuccess = <A>(schema: Schema<A>, u: unknown, a: A = u as any) => {
  const t = P.decode(schema)(u)
  expect(T.isRight(t)).toEqual(true)
  expect(t).toEqual(T.right(a))
}

export const expectDecodingFailure = <A>(
  schema: Schema<A>,
  u: unknown,
  message: string,
  options?: P.ParseOptions
) => {
  const t = pipe(P.decode(schema)(u, options), T.mapLeft(formatAll))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectDecodingWarning = <A>(
  schema: Schema<A>,
  u: unknown,
  a: A,
  message: string,
  options?: P.ParseOptions
) => {
  const t = pipe(P.decode(schema)(u, options), T.mapLeft(formatAll))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}

export const expectEncodingSuccess = <A>(schema: Schema<A>, a: A, o: unknown) => {
  const t = P.encode(schema)(a)
  expect(T.isRight(t)).toEqual(true)
  expect(t).toStrictEqual(T.right(o))
}

export const expectEncodingFailure = <A>(
  schema: Schema<A>,
  a: A,
  message: string,
  options?: P.ParseOptions
) => {
  const t = pipe(P.encode(schema)(a, options), T.mapLeft(formatAll))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectEncodingWarning = <A>(
  schema: Schema<A>,
  a: A,
  o: unknown,
  message: string,
  options?: P.ParseOptions
) => {
  const t = pipe(P.encode(schema)(a, options), T.mapLeft(formatAll))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, o))
}

const formatAll = (errors: NonEmptyReadonlyArray<PE.ParseError>): string => {
  return pipe(errors, RA.map(formatDecodeError), RA.join(", "))
}

const formatDecodeError = (e: PE.ParseError): string => {
  switch (e._tag) {
    case "Type":
      return `${formatActual(e.actual)} did not satisfy: Input must be ${formatAST(e.expected)}`
    case "Refinement":
      return `${formatActual(e.actual)} did not satisfy: ${e.meta.message}`
    case "Transform":
      return `${formatActual(e.actual)} did not satisfy parsing from (${e.from}) to (${e.to})`
    case "Equal":
      return `${formatActual(e.actual)} did not satisfy isEqual(${String(e.expected)})`
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

export const expectDecodingFailureTree = <A>(schema: Schema<A>, u: unknown, message: string) => {
  const t = pipe(P.decode(schema)(u), T.mapLeft(formatErrors))
  expect(T.isLeft(t)).toEqual(true)
  expect(t).toEqual(T.left(message))
}

export const expectDecodingWarningTree = <A>(
  schema: Schema<A>,
  u: unknown,
  message: string,
  a: A
) => {
  const t = pipe(P.decode(schema)(u), T.mapLeft(formatErrors))
  expect(T.isBoth(t)).toEqual(true)
  expect(t).toEqual(T.both(message, a))
}
