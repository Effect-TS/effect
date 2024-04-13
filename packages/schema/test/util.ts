import * as A from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import { getFinalTransformation } from "@effect/schema/ParseResult"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { formatErrorSync } from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"
import * as fc from "fast-check"
import { expect } from "vitest"

const doEffectify = true
const doRoundtrip = false

export const sleep = Effect.sleep(Duration.millis(10))

const effectifyDecode = <R>(
  decode: (input: any, options: ParseOptions, self: AST.Transformation) => Effect.Effect<any, ParseResult.ParseIssue, R>
): (input: any, options: ParseOptions, self: AST.Transformation) => Effect.Effect<any, ParseResult.ParseIssue, R> =>
(input, options, ast) => ParseResult.flatMap(sleep, () => decode(input, options, ast))

const effectifyAST = (ast: AST.AST): AST.AST => {
  switch (ast._tag) {
    case "TupleType":
      return new AST.TupleType(
        ast.elements.map((e) => new AST.Element(effectifyAST(e.type), e.isOptional)),
        ast.rest.map((ast) => effectifyAST(ast)),
        ast.isReadonly,
        ast.annotations
      )
    case "TypeLiteral":
      return new AST.TypeLiteral(
        ast.propertySignatures.map((p) =>
          new AST.PropertySignature(p.name, effectifyAST(p.type), p.isOptional, p.isReadonly, p.annotations)
        ),
        ast.indexSignatures.map((is) => {
          return new AST.IndexSignature(is.parameter, effectifyAST(is.type), is.isReadonly)
        }),
        ast.annotations
      )
    case "Union":
      return AST.Union.make(ast.types.map((ast) => effectifyAST(ast)), ast.annotations)
    case "Suspend":
      return new AST.Suspend(() => effectifyAST(ast.f()), ast.annotations)
    case "Refinement":
      return new AST.Refinement(
        effectifyAST(ast.from),
        ast.filter,
        ast.annotations
      )
    case "Transformation":
      return new AST.Transformation(
        effectifyAST(ast.from),
        effectifyAST(ast.to),
        new AST.FinalTransformation(
          effectifyDecode(getFinalTransformation(ast.transformation, true)),
          effectifyDecode(getFinalTransformation(ast.transformation, false))
        ),
        ast.annotations
      )
  }
  const schema = S.make(ast)
  const decode = S.decode(schema)
  const encode = S.encode(schema)
  return new AST.Transformation(
    AST.encodedAST(ast),
    AST.typeAST(ast),
    new AST.FinalTransformation(
      (a, options) => Effect.flatMap(sleep, () => ParseResult.mapError(decode(a, options), (e) => e.error)),
      (a, options) => Effect.flatMap(sleep, () => ParseResult.mapError(encode(a, options), (e) => e.error))
    )
  )
}

export const effectify = <A, I>(schema: S.Schema<A, I, never>): S.Schema<A, I, never> =>
  S.make(effectifyAST(schema.ast))

export const roundtrip = <A, I>(schema: S.Schema<A, I, never>, params?: Parameters<typeof fc.assert>[1]) => {
  if (!doRoundtrip) {
    return
  }
  const arb = A.makeLazy(schema)
  const is = S.is(schema)
  const encode = S.encode(schema)
  const decode = S.decode(schema)
  fc.assert(
    fc.property(arb(fc), (a) => {
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
    }),
    params
  )
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

export const identityTransform = <A>(schema: S.Schema<A>): S.Schema<A> => schema.pipe(S.Compose(schema))

export const X2 = S.transform(
  S.String,
  S.String,
  { decode: (s) => s + s, encode: (s) => s.substring(0, s.length / 2) }
)

export const X3 = S.transform(
  S.String,
  S.String,
  { decode: (s) => s + s + s, encode: (s) => s.substring(0, s.length / 3) }
)

const doProperty = true

export const expectValidArbitrary = <A, I>(schema: S.Schema<A, I, never>, params?: fc.Parameters<[A]>) => {
  if (!doProperty) {
    return
  }
  const arb = A.makeLazy(schema)(fc)
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
  const arbitrary = A.makeLazy(schema)
  const arb = arbitrary(fc)
  console.log(JSON.stringify(fc.sample(arb, n), null, 2))
}

export const NumberFromChar = S.Char.pipe(S.Compose(S.NumberFromString)).annotations({
  identifier: "NumberFromChar"
})

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
  expect(await Effect.runPromise(Effect.either(Effect.mapError(effect, formatErrorSync)))).toStrictEqual(
    Either.left(message)
  )
}

export const expectEffectSuccess = async <E, A>(effect: Effect.Effect<A, E>, a: A) => {
  expect(await Effect.runPromise(Effect.either(effect))).toStrictEqual(
    Either.right(a)
  )
}

export const expectEitherLeft = <A>(e: Either.Either<A, ParseResult.ParseError>, message: string) => {
  expect(Either.mapLeft(e, formatErrorSync)).toStrictEqual(Either.left(message))
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

export const AsyncDeclaration = S.Declare(
  [],
  {
    decode: () => (u) => Effect.andThen(Effect.sleep("10 millis"), Effect.succeed(u)),
    encode: () => (u) => Effect.andThen(Effect.sleep("10 millis"), Effect.succeed(u))
  },
  {
    identifier: "AsyncDeclaration"
  }
)

export const AsyncString = effectify(S.String).annotations({ identifier: "AsyncString" })

const Name = Context.GenericTag<"Name", string>("Name")

export const DependencyString = S.transformOrFail(
  S.String,
  S.String,
  { decode: (s) => Effect.andThen(Name, s), encode: (s) => Effect.andThen(Name, s) }
).annotations({ identifier: "DependencyString" })
