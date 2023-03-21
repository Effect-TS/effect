import * as Duration from "@effect/data/Duration"
import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as RA from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as A from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import type * as PR from "@effect/schema/ParseResult"
import type { Schema } from "@effect/schema/Schema"
import * as S from "@effect/schema/Schema"
import { formatActual, formatErrors, formatExpected } from "@effect/schema/TreeFormatter"
import * as fc from "fast-check"

const sleep = Effect.sleep(Duration.millis(10))

const goDecode = (
  decode: (input: any, options?: ParseOptions) => PR.ParseResult<any>
): (input: any, options?: ParseOptions) => PR.ParseResult<any> =>
  (input, options) => Effect.flatMap(sleep, () => decode(input, options))

let skip = false

const go = (ast: AST.AST, mode: "all" | "semi"): AST.AST => {
  if (mode === "semi") {
    skip = !skip
    if (!skip) {
      return ast
    }
  }
  switch (ast._tag) {
    case "Literal":
      // do not perturb literals otherwise the union optimisation algorithm doesn't kick in
      return ast
    case "Declaration":
      return AST.createDeclaration(
        ast.typeParameters.map((ast) => go(ast, mode)),
        ast.type,
        ast.decode,
        ast.annotations
      )
    case "Tuple":
      return AST.createTuple(
        ast.elements.map((e) => AST.createElement(go(e.type, mode), e.isOptional)),
        O.map(ast.rest, RA.mapNonEmpty((ast) => go(ast, mode))),
        ast.isReadonly,
        ast.annotations
      )
    case "TypeLiteral":
      return AST.createTypeLiteral(
        ast.propertySignatures.map((p) => ({ ...p, type: go(p.type, mode) })),
        ast.indexSignatures.map((is) =>
          AST.createIndexSignature(is.parameter, go(is.type, mode), is.isReadonly)
        ),
        ast.annotations
      )
    case "Union":
      return AST.createUnion(ast.types.map((ast) => go(ast, mode)), ast.annotations)
    case "Lazy":
      return AST.createLazy(() => go(ast.f(), mode), ast.annotations)
    case "Refinement":
      return AST.createRefinement(
        go(ast.from, mode),
        go(ast.to, mode),
        goDecode(ast.decode),
        goDecode(ast.encode),
        ast.annotations
      )
    case "Transform":
      return AST.createTransform(
        go(ast.from, mode),
        go(ast.to, mode),
        goDecode(ast.decode),
        goDecode(ast.encode),
        ast.annotations
      )
  }
  const decode = S.decodeEffect(S.make(ast))
  return AST.createTransform(
    AST.unknownKeyword,
    ast,
    (a, options) => Effect.flatMap(sleep, () => decode(a, options)),
    (a, options) => Effect.flatMap(sleep, () => decode(a, options))
  )
}

export const effectifySchema = <I, A>(schema: Schema<I, A>, mode: "all" | "semi"): Schema<I, A> =>
  S.make(go(schema.ast, mode))

const doEffectify = true

export const roundtrip = <I, A>(schema: Schema<I, A>) => {
  const to = S.to(schema)
  const arb = A.to(to)
  const is = S.is(to)
  fc.assert(fc.property(arb(fc), (a) => {
    if (!is(a)) {
      return false
    }
    const roundtrip = pipe(
      a,
      S.encodeEither(schema),
      E.flatMap(S.decodeEither(schema))
    )
    if (E.isLeft(roundtrip)) {
      return false
    }
    return is(roundtrip.right)
  }))
  if (doEffectify) {
    // const effect = effectifySchema(schema, "semi")
    // fc.assert(fc.asyncProperty(arb(fc), async (a) => {
    //   const roundtrip = await Effect.runPromiseEither(
    //     PR.flatMap(S.encodeEffect(effect)(a), S.decodeEffect(effect))
    //   )
    //   return E.isRight(roundtrip)
    // }))
  }
}

export const expectParseSuccess = async <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  a: A = u as any,
  options?: ParseOptions
) => {
  const parseEitherResult = S.parseEither(schema)(u, options)
  expect(parseEitherResult).toStrictEqual(E.right(a))
  if (doEffectify) {
    const parseEffectResult = await Effect.runPromiseEither(
      S.parseEffect(effectifySchema(schema, "all"))(u, options)
    )
    expect(parseEffectResult).toStrictEqual(parseEitherResult)
    const semiParseEffectResult = await Effect.runPromiseEither(
      S.parseEffect(effectifySchema(schema, "semi"))(u, options)
    )
    expect(semiParseEffectResult).toStrictEqual(parseEitherResult)
  }
}

export const expectParseFailure = async <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  message: string,
  options?: ParseOptions
) => {
  const parseEitherResult = E.mapLeft(S.parseEither(schema)(u, options), (e) => formatAll(e.errors))
  expect(parseEitherResult).toStrictEqual(E.left(message))
  if (doEffectify) {
    const parseEffectResult = E.mapLeft(
      await Effect.runPromiseEither(S.parseEffect(effectifySchema(schema, "all"))(u, options)),
      (e) => formatAll(e.errors)
    )
    expect(parseEffectResult).toStrictEqual(parseEitherResult)
    const semiParseEffectResult = E.mapLeft(
      await Effect.runPromiseEither(S.parseEffect(effectifySchema(schema, "semi"))(u, options)),
      (e) => formatAll(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(parseEitherResult)
  }
}

export const expectParseFailureTree = async <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  message: string,
  options?: ParseOptions
) => {
  const parseEitherResult = E.mapLeft(
    S.parseEither(schema)(u, options),
    (e) => formatErrors(e.errors)
  )
  expect(parseEitherResult).toEqual(E.left(message))
  if (doEffectify) {
    const parseEffectResult = E.mapLeft(
      await Effect.runPromiseEither(S.parseEffect(effectifySchema(schema, "all"))(u, options)),
      (e) => formatErrors(e.errors)
    )
    expect(parseEffectResult).toStrictEqual(parseEitherResult)
    const semiParseEffectResult = E.mapLeft(
      await Effect.runPromiseEither(S.parseEffect(effectifySchema(schema, "semi"))(u, options)),
      (e) => formatErrors(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(parseEitherResult)
  }
}

export const expectEncodeSuccess = async <I, A>(
  schema: Schema<I, A>,
  a: A,
  o: unknown,
  options?: ParseOptions
) => {
  const encodeEitherResult = S.encodeEither(schema)(a, options)
  expect(encodeEitherResult).toStrictEqual(E.right(o))
  if (doEffectify) {
    const encodeEffectResult = await Effect.runPromiseEither(
      S.encodeEffect(effectifySchema(schema, "all"))(a, options)
    )
    expect(encodeEffectResult).toStrictEqual(encodeEitherResult)
    const randomEncodeEffectResult = await Effect.runPromiseEither(
      S.encodeEffect(effectifySchema(schema, "semi"))(a, options)
    )
    expect(randomEncodeEffectResult).toStrictEqual(encodeEitherResult)
  }
}

export const expectEncodeFailure = async <I, A>(
  schema: Schema<I, A>,
  a: A,
  message: string,
  options?: ParseOptions
) => {
  const encodeEitherResult = E.mapLeft(
    S.encodeEither(schema)(a, options),
    (e) => formatAll(e.errors)
  )
  expect(encodeEitherResult).toStrictEqual(E.left(message))
  if (doEffectify) {
    const encodeEffectResult = E.mapLeft(
      await Effect.runPromiseEither(S.encodeEffect(effectifySchema(schema, "all"))(a, options)),
      (e) => formatAll(e.errors)
    )
    expect(encodeEffectResult).toStrictEqual(encodeEitherResult)
    const randomEncodeEffectResult = E.mapLeft(
      await Effect.runPromiseEither(S.encodeEffect(effectifySchema(schema, "semi"))(a, options)),
      (e) => formatAll(e.errors)
    )
    expect(randomEncodeEffectResult).toStrictEqual(encodeEitherResult)
  }
}

const formatAll = (errors: NonEmptyReadonlyArray<PR.ParseErrors>): string => {
  return pipe(errors, RA.map(formatDecodeError), RA.join(", "))
}

const getMessage = AST.getAnnotation<AST.MessageAnnotation<unknown>>(AST.MessageAnnotationId)

const formatDecodeError = (e: PR.ParseErrors): string => {
  switch (e._tag) {
    case "Type":
      return pipe(
        getMessage(e.expected),
        O.map((f) => f(e.actual)),
        O.orElse(() => e.message),
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
