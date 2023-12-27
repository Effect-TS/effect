import * as A from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import { getFinalTransformation } from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { formatActual, formatErrors, formatExpected } from "@effect/schema/TreeFormatter"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import * as RA from "effect/ReadonlyArray"
import * as fc from "fast-check"
import { expect } from "vitest"

const doEffectify = true
const doRoundtrip = true

export const sleep = Effect.sleep(Duration.millis(10))

const effectifyDecode = (
  decode: (input: any, options: ParseOptions, self: AST.AST) => PR.ParseResult<any>,
  override: AST.AST
): (input: any, options: ParseOptions, self: AST.AST) => PR.ParseResult<any> =>
(input, options) => PR.flatMap(sleep, () => decode(input, options, override))

let skip = false

const effectifyAST = (ast: AST.AST, mode: "all" | "semi"): AST.AST => {
  if (mode === "semi") {
    skip = !skip
    if (!skip) {
      return ast
    }
  }
  switch (ast._tag) {
    case "Tuple":
      return AST.createTuple(
        ast.elements.map((e) => AST.createElement(effectifyAST(e.type, mode), e.isOptional)),
        Option.map(ast.rest, RA.map((ast) => effectifyAST(ast, mode))),
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
    case "Suspend":
      return AST.createSuspend(() => effectifyAST(ast.f(), mode), ast.annotations)
    case "Refinement":
      return AST.createRefinement(
        effectifyAST(ast.from, mode),
        ast.filter,
        ast.annotations
      )
    case "Transform":
      return AST.createTransform(
        effectifyAST(ast.from, mode),
        effectifyAST(ast.to, mode),
        AST.createFinalTransformation(
          // I need to override with the original ast here in order to not change the error message
          // --------------------------------------------------v
          effectifyDecode(getFinalTransformation(ast.transformation, true), ast),
          // I need to override with the original ast here in order to not change the error message
          // ---------------------------------------------------v
          effectifyDecode(getFinalTransformation(ast.transformation, false), ast)
        ),
        ast.annotations
      )
  }
  const schema = S.make(ast)
  const decode = S.decode(schema)
  const encode = S.encode(schema)
  return AST.createTransform(
    AST.from(ast),
    AST.to(ast),
    AST.createFinalTransformation(
      (a, options) => Effect.flatMap(sleep, () => decode(a, options)),
      (a, options) => Effect.flatMap(sleep, () => encode(a, options))
    )
  )
}

export const effectify = <I, A>(schema: S.Schema<I, A>, mode: "all" | "semi"): S.Schema<I, A> =>
  S.make(effectifyAST(schema.ast, mode))

export const roundtrip = <I, A>(schema: S.Schema<I, A>) => {
  if (!doRoundtrip) {
    return
  }
  const arb = A.to(schema)
  const is = S.is(schema)
  const encode = S.encode(schema)
  const decode = S.decode(schema)
  fc.assert(fc.property(arb(fc), (a) => {
    const roundtrip = encode(a).pipe(
      Effect.mapError(() => "encoding" as const),
      Effect.flatMap((i) => decode(i).pipe(Effect.mapError(() => "decoding" as const))),
      Effect.either,
      Effect.runSync
    )
    if (Either.isLeft(roundtrip)) {
      return roundtrip.left === "encoding"
    }
    return is(roundtrip.right)
  }))
  if (doEffectify) {
    const effectSchema = effectify(schema, "all")
    const encode = S.encode(effectSchema)
    const decode = S.decode(effectSchema)
    fc.assert(fc.asyncProperty(arb(fc), async (a) => {
      const roundtrip = await encode(a).pipe(
        Effect.mapError(() => "encoding" as const),
        Effect.flatMap((i) => decode(i).pipe(Effect.mapError(() => "decoding" as const))),
        Effect.either,
        Effect.runPromise
      )
      if (Either.isLeft(roundtrip)) {
        return roundtrip.left === "encoding"
      }
      return is(roundtrip.right)
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
  schema: S.Schema<I, A>,
  input: unknown,
  expected: A = input as any,
  options?: ParseOptions
) => {
  const actual = Effect.runSync(Effect.either(S.parse(schema)(input, options)))
  expect(actual).toStrictEqual(Either.right(expected))
  if (doEffectify) {
    const parseEffectResult = await Effect.runPromise(
      Effect.either(S.parse(effectify(schema, "all"))(input, options))
    )
    expect(parseEffectResult).toStrictEqual(actual)
    const semiParseEffectResult = await Effect.runPromise(
      Effect.either(S.parse(effectify(schema, "semi"))(input, options))
    )
    expect(semiParseEffectResult).toStrictEqual(actual)
  }
}

export const expectParseFailure = async <I, A>(
  schema: S.Schema<I, A>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(S.parse(schema)(input, options))),
    (e) => formatAll(e.errors)
  )
  expect(actual).toStrictEqual(Either.left(message))
  if (doEffectify) {
    const parseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "all"))(input, options))),
      (e) => formatAll(e.errors)
    )
    expect(parseEffectResult).toStrictEqual(actual)
    const semiParseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "semi"))(input, options))),
      (e) => formatAll(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(actual)
  }
}

export const expectParseFailureTree = async <I, A>(
  schema: S.Schema<I, A>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(S.parse(schema)(input, options))),
    (e) => formatErrors(e.errors)
  )
  expect(actual).toEqual(Either.left(message))
  if (doEffectify) {
    const parseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "all"))(input, options))),
      (e) => formatErrors(e.errors)
    )
    expect(parseEffectResult).toStrictEqual(actual)
    const semiParseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.parse(effectify(schema, "semi"))(input, options))),
      (e) => formatErrors(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(actual)
  }
}

export const expectEncodeSuccess = async <I, A>(
  schema: S.Schema<I, A>,
  a: A,
  expected: unknown,
  options?: ParseOptions
) => {
  const actual = Effect.runSync(Effect.either(S.encode(schema)(a, options)))
  expect(actual).toStrictEqual(Either.right(expected))
  if (doEffectify) {
    const allencodeEffectResult = await Effect.runPromise(
      Effect.either(S.encode(effectify(schema, "all"))(a, options))
    )
    expect(allencodeEffectResult).toStrictEqual(actual)
    const semiEncodeEffectResult = await Effect.runPromise(
      Effect.either(S.encode(effectify(schema, "semi"))(a, options))
    )
    expect(semiEncodeEffectResult).toStrictEqual(actual)
  }
}

export const expectEncodeFailure = async <I, A>(
  schema: S.Schema<I, A>,
  a: A,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(S.encode(schema)(a, options))),
    (e) => formatAll(e.errors)
  )
  expect(actual).toStrictEqual(Either.left(message))
  if (doEffectify) {
    const encodeEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.encode(effectify(schema, "all"))(a, options))),
      (e) => formatAll(e.errors)
    )
    expect(encodeEffectResult).toStrictEqual(actual)
    const randomEncodeEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(S.encode(effectify(schema, "semi"))(a, options))),
      (e) => formatAll(e.errors)
    )
    expect(randomEncodeEffectResult).toStrictEqual(actual)
  }
}

export const formatAll = (errors: NonEmptyReadonlyArray<PR.ParseIssue>): string =>
  pipe(errors, RA.map(formatDecodeError), RA.join(", "))

const getMessage = AST.getAnnotation<AST.MessageAnnotation<unknown>>(AST.MessageAnnotationId)

const formatDecodeError = (e: PR.ParseIssue): string => {
  switch (e._tag) {
    case "Type":
      return pipe(
        getMessage(e.expected),
        Option.map((f) => f(e.actual)),
        Option.orElse(() => e.message),
        Option.getOrElse(() => `Expected ${formatExpected(e.expected)}, actual ${formatActual(e.actual)}`)
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
      return "is unexpected" +
        (Option.isSome(e.ast) ? `, expected ${formatExpected(e.ast.value)}` : "")
    case "UnionMember":
      return `union member: ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
  }
}

export const printAST = <I, A>(schema: S.Schema<I, A>) => {
  console.log("%o", schema.ast)
}

export const identityTransform = <A>(schema: S.Schema<A>): S.Schema<A, A> => schema.pipe(S.compose(schema))

export const X2 = S.transform(
  S.string,
  S.string,
  (s) => s + s,
  (s) => s.substring(0, s.length / 2)
)

export const X3 = S.transform(
  S.string,
  S.string,
  (s) => s + s + s,
  (s) => s.substring(0, s.length / 3)
)

const doProperty = true

export const propertyTo = <I, A>(schema: S.Schema<I, A>, params?: fc.Parameters<[A]>) => {
  if (!doProperty) {
    return
  }
  const arbitrary = A.to(schema)
  const arb = arbitrary(fc)
  // console.log(JSON.stringify(fc.sample(arb, 10), null, 2))
  const is = S.is(schema)
  fc.assert(fc.property(arb, (a) => is(a)), params)
}

export const propertyFrom = <I, A>(schema: S.Schema<I, A>) => {
  if (!doProperty) {
    return
  }
  const arbitrary = A.from(schema)
  const arb = arbitrary(fc)
  // console.log(JSON.stringify(fc.sample(arb, 10), null, 2))
  const is = S.is(S.from(schema))
  fc.assert(fc.property(arb, (a) => is(a)))
}

export const isBun = "Bun" in globalThis

export const resolves = async <A>(promise: Promise<A>, a: A) => {
  try {
    const actual = await promise
    expect(actual).toStrictEqual(a)
  } catch (_e) {
    throw new Error(`Promise didn't resolve`)
  }
}

export const rejects = async <A>(promise: Promise<A>) => {
  try {
    await promise
    throw new Error(`Promise didn't reject`)
  } catch (_e) {
    // ok
  }
}

export const sample = <I, A>(schema: S.Schema<I, A>, n: number) => {
  const arbitrary = A.to(schema)
  const arb = arbitrary(fc)
  console.log(JSON.stringify(fc.sample(arb, n), null, 2))
}

export const NumberFromChar = S.string.pipe(S.length(1), S.compose(S.NumberFromString))

export const Char = S.string.pipe(S.length(1))
