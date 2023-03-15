import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import type { ParseOptions } from "@effect/schema/AST"
import * as PR from "@effect/schema/ParseResult"
import type { Schema } from "@effect/schema/Schema"
import * as S from "@effect/schema/Schema"
import { formatActual, formatErrors, formatExpected } from "@effect/schema/TreeFormatter"
import * as fc from "fast-check"

export const roundtrip = <I, A>(schema: Schema<I, A>) => {
  const to = S.to(schema)
  const arb = A.to(to)
  const is = S.is(to)
  fc.assert(fc.property(arb(fc), (a) => {
    if (!is(a)) {
      return false
    }
    const roundtrip = pipe(a, S.encodeEither(schema), E.flatMap(S.decodeEither(schema)))
    if (PR.isFailure(roundtrip)) {
      return false
    }
    return is(roundtrip.right)
  }))
}

export const expectDecodingSuccess = <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  a: A = u as any,
  options?: ParseOptions
) => {
  const t = S.decodeEither(schema)(u, options)
  expect(t).toStrictEqual(E.right(a))
}

export const expectDecodingFailure = <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  message: string,
  options?: ParseOptions
) => {
  const t = pipe(S.decodeEither(schema)(u, options), E.mapLeft(formatAll))
  expect(t).toStrictEqual(E.left(message))
}

export const expectEncodingSuccess = <I, A>(
  schema: Schema<I, A>,
  a: A,
  o: unknown,
  options?: ParseOptions
) => {
  const t = S.encodeEither(schema)(a, options)
  expect(t).toStrictEqual(E.right(o))
}

export const expectEncodingFailure = <I, A>(
  schema: Schema<I, A>,
  a: A,
  message: string,
  options?: ParseOptions
) => {
  const t = pipe(S.encodeEither(schema)(a, options), E.mapLeft(formatAll))
  expect(t).toStrictEqual(E.left(message))
}

const formatAll = (errors: NonEmptyReadonlyArray<PR.ParseError>): string => {
  return pipe(errors, RA.map(formatDecodeError), RA.join(", "))
}

const getMessage = AST.getAnnotation<AST.MessageAnnotation<unknown>>(AST.MessageAnnotationId)

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

export const expectDecodingFailureTree = <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  message: string,
  options?: ParseOptions
) => {
  const t = pipe(S.decodeEither(schema)(u, options), E.mapLeft(formatErrors))
  expect(E.isLeft(t)).toEqual(true)
  expect(t).toEqual(E.left(message))
}
