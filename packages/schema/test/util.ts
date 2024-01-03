import * as A from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import { getFinalTransformation } from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { formatError } from "@effect/schema/TreeFormatter"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import * as RA from "effect/ReadonlyArray"
import * as fc from "fast-check"
import { expect } from "vitest"

const doEffectify = true
const doRoundtrip = true

export const sleep = Effect.sleep(Duration.millis(10))

const effectifyDecode = (
  decode: (input: any, options: ParseOptions, self: AST.AST) => PR.ParseResult<any>
): (input: any, options: ParseOptions, self: AST.AST) => PR.ParseResult<any> =>
(input, options, ast) => PR.flatMap(sleep, () => decode(input, options, ast))

const effectifyAST = (ast: AST.AST): AST.AST => {
  switch (ast._tag) {
    case "Tuple":
      return AST.createTuple(
        ast.elements.map((e) => AST.createElement(effectifyAST(e.type), e.isOptional)),
        Option.map(ast.rest, RA.map((ast) => effectifyAST(ast))),
        ast.isReadonly,
        ast.annotations
      )
    case "TypeLiteral":
      return AST.createTypeLiteral(
        ast.propertySignatures.map((p) => ({ ...p, type: effectifyAST(p.type) })),
        ast.indexSignatures.map((is) => {
          return AST.createIndexSignature(is.parameter, effectifyAST(is.type), is.isReadonly)
        }),
        ast.annotations
      )
    case "Union":
      return AST.createUnion(ast.types.map((ast) => effectifyAST(ast)), ast.annotations)
    case "Suspend":
      return AST.createSuspend(() => effectifyAST(ast.f()), ast.annotations)
    case "Refinement":
      return AST.createRefinement(
        effectifyAST(ast.from),
        ast.filter,
        ast.annotations
      )
    case "Transform":
      return AST.createTransform(
        effectifyAST(ast.from),
        effectifyAST(ast.to),
        AST.createFinalTransformation(
          effectifyDecode(getFinalTransformation(ast.transformation, true)),
          effectifyDecode(getFinalTransformation(ast.transformation, false))
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

export const effectify = <I, A>(schema: S.Schema<I, A>): S.Schema<I, A> => S.make(effectifyAST(schema.ast))

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
    const effectSchema = effectify(schema)
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
}

export const expectParseFailure = async <I, A>(
  schema: S.Schema<I, A>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(S.parse(schema)(input, options))),
    (e) => formatError(e.error)
  )
  expect(actual).toEqual(Either.left(message))
}

export const expectEncodeSuccess = async <I, A>(
  schema: S.Schema<I, A>,
  a: A,
  expected: unknown,
  options?: ParseOptions
) => {
  const actual = Effect.runSync(Effect.either(S.encode(schema)(a, options)))
  expect(actual).toStrictEqual(Either.right(expected))
}

export const expectEncodeFailure = async <I, A>(
  schema: S.Schema<I, A>,
  a: A,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(S.encode(schema)(a, options))),
    (e) => formatError(e.error)
  )
  expect(actual).toStrictEqual(Either.left(message))
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

export const NumberFromChar = S.Char.pipe(S.compose(S.NumberFromString)).pipe(
  S.identifier("NumberFromChar")
)
