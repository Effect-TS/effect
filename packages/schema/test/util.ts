import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as annotations from "@fp-ts/schema/annotation/AST"
import * as A from "@fp-ts/schema/Arbitrary"
import * as AST from "@fp-ts/schema/AST"
import type { ParseOptions } from "@fp-ts/schema/AST"
import { formatActual, formatErrors, formatExpected } from "@fp-ts/schema/formatter/Tree"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Parser"
import * as PR from "@fp-ts/schema/ParseResult"
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
    if (PR.isFailure(roundtrip)) {
      return false
    }
    return is(roundtrip.right)
  }))
}

export const expectDecodingSuccess = <A>(
  schema: Schema<A>,
  u: unknown,
  a: A = u as any,
  options?: ParseOptions
) => {
  const t = P.decode(schema)(u, options)
  expect(t).toStrictEqual(E.right(a))
}

export const expectDecodingFailure = <A>(
  schema: Schema<A>,
  u: unknown,
  message: string,
  options?: ParseOptions
) => {
  const t = pipe(P.decode(schema)(u, options), E.mapLeft(formatAll))
  expect(t).toStrictEqual(E.left(message))
}

export const expectEncodingSuccess = <A>(
  schema: Schema<A>,
  a: A,
  o: unknown,
  options?: ParseOptions
) => {
  const t = P.encode(schema)(a, options)
  expect(t).toStrictEqual(E.right(o))
}

export const expectEncodingFailure = <A>(
  schema: Schema<A>,
  a: A,
  message: string,
  options?: ParseOptions
) => {
  const t = pipe(P.encode(schema)(a, options), E.mapLeft(formatAll))
  expect(t).toStrictEqual(E.left(message))
}

const formatAll = (errors: NonEmptyReadonlyArray<PR.ParseError>): string => {
  return pipe(errors, RA.map(formatDecodeError), RA.join(", "))
}

const getMessage = AST.getAnnotation<annotations.Message<unknown>>(annotations.MessageId)

const formatDecodeError = (e: PR.ParseError): string => {
  switch (e._tag) {
    case "Type":
      return pipe(
        getMessage(e.expected),
        O.map((f) => f(e.actual)),
        O.getOrElse(() =>
          `Expected ${formatExpected(e.expected)}, actual ${formatActual(e.actual)}`
        )
      )
    case "Index":
      return `/${e.index} ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
    case "Key":
      return `/${String(e.key)} ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
    case "Missing":
      return `is missing`
    case "Unexpected":
      return `is unexpected`
    case "UnionMember":
      return `union member: ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
  }
}

export const expectDecodingFailureTree = <A>(schema: Schema<A>, u: unknown, message: string) => {
  const t = pipe(P.decode(schema)(u), E.mapLeft(formatErrors))
  expect(E.isLeft(t)).toEqual(true)
  expect(t).toEqual(E.left(message))
}
