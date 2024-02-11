import * as A from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import { getFinalTransformation } from "@effect/schema/Parser"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { formatError } from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import * as RA from "effect/ReadonlyArray"
import * as Runtime from "effect/Runtime"
import * as fc from "fast-check"
import { expect } from "vitest"

const doEffectify = true
const doRoundtrip = true

export const sleep = Effect.sleep(Duration.millis(10))

const effectifyDecode = <R>(
  decode: (input: any, options: ParseOptions, self: AST.Transform) => Effect.Effect<any, ParseResult.ParseIssue, R>
): (input: any, options: ParseOptions, self: AST.Transform) => Effect.Effect<any, ParseResult.ParseIssue, R> =>
(input, options, ast) => ParseResult.flatMap(sleep, () => decode(input, options, ast))

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
      (a, options) => Effect.flatMap(sleep, () => ParseResult.mapError(decode(a, options), (e) => e.error)),
      (a, options) => Effect.flatMap(sleep, () => ParseResult.mapError(encode(a, options), (e) => e.error))
    )
  )
}

export const effectify = <A, I>(schema: S.Schema<A, I, never>): S.Schema<A, I, never> =>
  S.make(effectifyAST(schema.ast))

export const roundtrip = <A, I>(schema: S.Schema<A, I, never>) => {
  if (!doRoundtrip) {
    return
  }
  const arb = A.make(schema)
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

export const onExcessPropertyPreserve: ParseOptions = {
  onExcessProperty: "preserve"
}

export const allErrors: ParseOptions = {
  errors: "all"
}

export const expectDecodeUnknownSuccess = async <A, I>(
  schema: S.Schema<A, I, never>,
  input: unknown,
  expected: A = input as any,
  options?: ParseOptions
) => expectSuccess(S.decodeUnknown(schema)(input, options), expected)

export const expectDecodeUnknownFailure = async <A, I>(
  schema: S.Schema<A, I, never>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => expectFailure(S.decodeUnknown(schema)(input, options), message)

export const expectEncodeSuccess = async <A, I>(
  schema: S.Schema<A, I, never>,
  a: A,
  expected: unknown,
  options?: ParseOptions
) => expectSuccess(S.encode(schema)(a, options), expected)

export const expectEncodeFailure = async <A, I>(
  schema: S.Schema<A, I, never>,
  a: A,
  message: string,
  options?: ParseOptions
) => expectFailure(S.encode(schema)(a, options), message)

export const printAST = <A, I, R>(schema: S.Schema<A, I, R>) => {
  console.log("%o", schema.ast)
}

export const identityTransform = <A>(schema: S.Schema<A>): S.Schema<A> => schema.pipe(S.compose(schema))

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

export const expectValidArbitrary = <A, I>(schema: S.Schema<A, I, never>, params?: fc.Parameters<[A]>) => {
  if (!doProperty) {
    return
  }
  const arb = A.make(schema)(fc)
  const is = S.is(schema)
  fc.assert(fc.property(arb, (a) => is(a)), params)
}

export const isBun = "Bun" in globalThis

export const expectPromiseSuccess = async <A>(promise: Promise<A>, a: A) => {
  try {
    const actual = await promise
    expect(actual).toStrictEqual(a)
  } catch (_e) {
    throw new Error(`Promise didn't resolve`)
  }
}

export const expectPromiseFailure = async <A>(promise: Promise<A>, message: string) => {
  try {
    await promise
    throw new Error(`Promise didn't reject`)
  } catch (e: any) {
    if (Runtime.isFiberFailure(e)) {
      expect((e.toJSON() as any).cause.failure.message).toStrictEqual(message)
    } else {
      throw new Error(`Promise didn't reject`)
    }
  }
}

export const sample = <A, I>(schema: S.Schema<A, I>, n: number) => {
  const arbitrary = A.make(schema)
  const arb = arbitrary(fc)
  console.log(JSON.stringify(fc.sample(arb, n), null, 2))
}

export const NumberFromChar = S.Char.pipe(S.compose(S.NumberFromString)).pipe(
  S.identifier("NumberFromChar")
)

export const expectFailure = async <A>(
  effect: Either.Either<A, ParseResult.ParseError> | Effect.Effect<A, ParseResult.ParseError>,
  message: string
) => {
  if (Either.isEither(effect)) {
    expectEitherLeft(effect, message)
  } else {
    expectEffectFailure(effect, message)
  }
}

export const expectSuccess = async <E, A>(
  effect: Either.Either<A, E> | Effect.Effect<A, E>,
  a: A
) => {
  if (Either.isEither(effect)) {
    expectEitherRight(effect, a)
  } else {
    expectEffectSuccess(effect, a)
  }
}

export const expectEffectFailure = async <A>(
  effect: Effect.Effect<A, ParseResult.ParseError>,
  message: string
) => {
  expect(await Effect.runPromise(Effect.either(Effect.mapError(effect, formatError)))).toStrictEqual(
    Either.left(message)
  )
}

export const expectEffectSuccess = async <E, A>(effect: Effect.Effect<A, E>, a: A) => {
  expect(await Effect.runPromise(Effect.either(effect))).toStrictEqual(
    Either.right(a)
  )
}

export const expectEitherLeft = <A>(e: Either.Either<A, ParseResult.ParseError>, message: string) => {
  expect(Either.mapLeft(e, formatError)).toStrictEqual(Either.left(message))
}

export const expectEitherRight = <E, A>(e: Either.Either<A, E>, a: A) => {
  expect(e).toStrictEqual(Either.right(a))
}

export const expectNone = <A>(o: Option.Option<A>) => {
  expect(o).toStrictEqual(Option.none())
}

export const expectSome = <A>(o: Option.Option<A>, a: A) => {
  expect(o).toStrictEqual(Option.some(a))
}

export const AsyncDeclaration = S.declare(
  [],
  () => (u) => Effect.andThen(Effect.sleep("10 millis"), Effect.succeed(u)),
  () => (u) => Effect.andThen(Effect.sleep("10 millis"), Effect.succeed(u)),
  {
    identifier: "AsyncDeclaration"
  }
)

export const AsyncString = effectify(S.string).pipe(S.identifier("AsyncString"))

const Name = Context.GenericTag<"Name", string>("Name")

export const DependencyString = S.transformOrFail(
  S.string,
  S.string,
  (s) => Effect.andThen(Name, s),
  (s) => Effect.andThen(Name, s)
).pipe(S.identifier("DependencyString"))
