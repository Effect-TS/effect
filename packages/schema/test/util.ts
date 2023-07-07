import * as Duration from "@effect/data/Duration"
import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as RA from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as A from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import * as PR from "@effect/schema/ParseResult"
import type { Schema } from "@effect/schema/Schema"
import * as S from "@effect/schema/Schema"
import { formatActual, formatErrors, formatExpected } from "@effect/schema/TreeFormatter"
import * as fc from "fast-check"

const doEffectify = true
const doRoundtrip = true

export const sleep = Effect.sleep(Duration.millis(10))

export const effectifyDecode = (
  decode: (input: any, options?: ParseOptions) => PR.ParseResult<any>
): (input: any, options?: ParseOptions) => PR.ParseResult<any> =>
  (input, options) => PR.flatMap(sleep, () => decode(input, options))

let skip = false

const effectifyAST = (ast: AST.AST, mode: "all" | "semi"): AST.AST => {
  if (mode === "semi") {
    skip = !skip
    if (!skip) {
      return ast
    }
  }
  switch (ast._tag) {
    case "Declaration":
      return AST.createDeclaration(
        ast.typeParameters.map((ast) => effectifyAST(ast, mode)),
        ast.type,
        ast.decode,
        ast.annotations
      )
    case "Tuple":
      return AST.createTuple(
        ast.elements.map((e) => AST.createElement(effectifyAST(e.type, mode), e.isOptional)),
        O.map(ast.rest, RA.mapNonEmpty((ast) => effectifyAST(ast, mode))),
        ast.isReadonly,
        ast.annotations
      )
    case "TypeLiteral":
      return AST.createTypeLiteral(
        ast.propertySignatures.map((p) => ({ ...p, type: effectifyAST(p.type, mode) })),
        ast.indexSignatures.map((is) =>
          AST.createIndexSignature(is.parameter, effectifyAST(is.type, mode), is.isReadonly)
        ),
        ast.annotations
      )
    case "Union":
      return AST.createUnion(ast.types.map((ast) => effectifyAST(ast, mode)), ast.annotations)
    case "Lazy":
      return AST.createLazy(() => effectifyAST(ast.f(), mode), ast.annotations)
    case "Refinement":
      return AST.createRefinement(
        effectifyAST(ast.from, mode),
        effectifyDecode(ast.decode),
        ast.isReversed,
        ast.annotations
      )
    case "Transform":
      return AST._createTransform(
        effectifyAST(ast.from, mode),
        effectifyAST(ast.to, mode),
        effectifyDecode(ast.decode),
        effectifyDecode(ast.encode),
        ast.propertySignatureTransformations,
        ast.annotations
      )
  }
  const decode = S.decode(S.make(ast))
  return AST._createTransform(
    ast,
    ast,
    (a, options) => Effect.flatMap(sleep, () => decode(a, options)),
    (a, options) => Effect.flatMap(sleep, () => decode(a, options)),
    []
  )
}

export const effectify = <I, A>(schema: Schema<I, A>, mode: "all" | "semi"): Schema<I, A> =>
  S.make(effectifyAST(schema.ast, mode))

export const roundtrip = <I, A>(schema: Schema<I, A>) => {
  if (!doRoundtrip) {
    return
  }
  const to = S.to(schema)
  const arb = A.to(to)
  const is = S.is(to)
  fc.assert(fc.property(arb(fc), (a) => {
    if (!is(a)) {
      return false
    }
    const roundtrip = pipe(
      a,
      S.encode(schema),
      Effect.flatMap(S.decode(schema)),
      Effect.runSyncExit
    )
    if (Exit.isFailure(roundtrip)) {
      return false
    }
    return is(roundtrip.value)
  }))
  if (doEffectify) {
    const effect = effectify(schema, "semi")
    fc.assert(fc.asyncProperty(arb(fc), async (a) => {
      const roundtrip = await Effect.runPromiseExit(
        PR.flatMap(S.encode(effect)(a), S.decode(effect))
      )
      return Exit.isSuccess(roundtrip)
    }))
  }
}

export const onExcessPropertyError: ParseOptions = {
  onExcessProperty: "error"
}

export const allErrors: ParseOptions = {
  errors: "all"
}

export const expectParseSuccess = async <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  a: A = u as any,
  options?: ParseOptions
) => {
  const either = Effect.runSync(Effect.either(S.parse(schema)(u, options)))
  expect(either).toStrictEqual(Either.right(a))
  if (doEffectify) {
    const parseResult = await Effect.runPromise(
      Effect.either(S.parse(effectify(schema, "all"))(u, options))
    )
    expect(parseResult).toStrictEqual(either)
    const semiParseEffectResult = await Effect.runPromise(
      Effect.either(S.parse(effectify(schema, "semi"))(u, options))
    )
    expect(semiParseEffectResult).toStrictEqual(either)
  }
}

export const expectParseFailure = async <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  message: string,
  options?: ParseOptions
) => {
  const either = Either.mapLeft(
    Effect.runSync(Effect.either(S.parse(schema)(u, options))),
    (e) => formatAll(e.errors)
  )
  expect(either).toStrictEqual(Either.left(message))
  if (doEffectify) {
    const parseResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "all"))(u, options))),
      (e) => formatAll(e.errors)
    )
    expect(parseResult).toStrictEqual(either)
    const semiParseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "semi"))(u, options))),
      (e) => formatAll(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(either)
  }
}

export const expectParseFailureTree = async <I, A>(
  schema: Schema<I, A>,
  u: unknown,
  message: string,
  options?: ParseOptions
) => {
  const either = Either.mapLeft(
    Effect.runSync(Effect.either(S.parse(schema)(u, options))),
    (e) => formatErrors(e.errors)
  )
  expect(either).toEqual(Either.left(message))
  if (doEffectify) {
    const parseResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "all"))(u, options))),
      (e) => formatErrors(e.errors)
    )
    expect(parseResult).toStrictEqual(either)
    const semiParseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "semi"))(u, options))),
      (e) => formatErrors(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(either)
  }
}

export const expectEncodeSuccess = async <I, A>(
  schema: Schema<I, A>,
  a: A,
  o: unknown,
  options?: ParseOptions
) => {
  const either = Effect.runSync(Effect.either(S.encode(schema)(a, options)))
  expect(either).toStrictEqual(Either.right(o))
  if (doEffectify) {
    const encodeResult = await Effect.runPromise(
      Effect.either(S.encode(effectify(schema, "all"))(a, options))
    )
    expect(encodeResult).toStrictEqual(either)
    const randomEncodeEffectResult = await Effect.runPromise(
      Effect.either(S.encode(effectify(schema, "semi"))(a, options))
    )
    expect(randomEncodeEffectResult).toStrictEqual(either)
  }
}

export const expectEncodeFailure = async <I, A>(
  schema: Schema<I, A>,
  a: A,
  message: string,
  options?: ParseOptions
) => {
  const either = Either.mapLeft(
    Effect.runSync(Effect.either(S.encode(schema)(a, options))),
    (e) => formatAll(e.errors)
  )
  expect(either).toStrictEqual(Either.left(message))
  if (doEffectify) {
    const encodeResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.encode(effectify(schema, "all"))(a, options))),
      (e) => formatAll(e.errors)
    )
    expect(encodeResult).toStrictEqual(either)
    const randomEncodeEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.encode(effectify(schema, "semi"))(a, options))),
      (e) => formatAll(e.errors)
    )
    expect(randomEncodeEffectResult).toStrictEqual(either)
  }
}

export const formatAll = (errors: NonEmptyReadonlyArray<PR.ParseErrors>): string => {
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
    case "Forbidden":
      return "is forbidden"
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
