import * as A from "effect/Arbitrary"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { getFinalTransformation } from "effect/ParseResult"
import * as ParseResult from "effect/ParseResult"
import * as Runtime from "effect/Runtime"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import * as AST from "effect/SchemaAST"
import * as fc from "fast-check"
import { assert, expect } from "vitest"
import * as SchemaTest from "./SchemaTest.js"

export const assertions = Effect.runSync(
  SchemaTest.assertions.pipe(
    Effect.provideService(SchemaTest.Assert, {
      deepStrictEqual: (actual, expected) => expect(actual).toStrictEqual(expected),
      throws: (fn, message) => expect(fn).toThrow(new Error(message))
    }),
    Effect.provideService(SchemaTest.AssertConfig, {
      arbitrary: {
        // is: false
      },
      roundtrip: {
        skip: true
      }
    })
  )
)

const sleep = Effect.sleep("10 millis")

const effectifyDecode = <R>(
  decode: (
    fromA: any,
    options: ParseOptions,
    self: AST.Transformation,
    fromI: any
  ) => Effect.Effect<any, ParseResult.ParseIssue, R>
): (
  fromA: any,
  options: ParseOptions,
  self: AST.Transformation,
  fromI: any
) => Effect.Effect<any, ParseResult.ParseIssue, R> =>
(fromA, options, ast, fromI) => ParseResult.flatMap(sleep, () => decode(fromA, options, ast, fromI))

const effectifyAST = (ast: AST.AST): AST.AST => {
  switch (ast._tag) {
    case "TupleType":
      return new AST.TupleType(
        ast.elements.map((e) => new AST.OptionalType(effectifyAST(e.type), e.isOptional, e.annotations)),
        ast.rest.map((annotatedAST) => new AST.Type(effectifyAST(annotatedAST.type), annotatedAST.annotations)),
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
      (a, options) => Effect.flatMap(sleep, () => ParseResult.mapError(decode(a, options), (e) => e.issue)),
      (a, options) => Effect.flatMap(sleep, () => ParseResult.mapError(encode(a, options), (e) => e.issue))
    )
  )
}

export const effectify = <A, I>(schema: S.Schema<A, I, never>): S.Schema<A, I, never> =>
  S.make(effectifyAST(schema.ast))

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
  // eslint-disable-next-line no-console
  console.log("%o", schema.ast)
}

export const identityTransform = <A>(schema: S.Schema<A>): S.Schema<A> => schema.pipe(S.compose(schema))

export const X2 = S.transform(
  S.String,
  S.String,
  { strict: true, decode: (s) => s + s, encode: (s) => s.substring(0, s.length / 2) }
)

export const X3 = S.transform(
  S.String,
  S.String,
  { strict: true, decode: (s) => s + s + s, encode: (s) => s.substring(0, s.length / 3) }
)

export const expectValidArbitrary = <A, I>(schema: S.Schema<A, I, never>, params?: fc.Parameters<[A]>) => {
  if (false as boolean) {
    return
  }
  const arb = A.makeLazy(schema)(fc)
  // console.log(fc.sample(arb, 10))
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
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(fc.sample(arb, n), null, 2))
}

export const NumberFromChar = S.Char.pipe(S.compose(S.NumberFromString)).annotations({
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
  expect(await Effect.runPromise(Effect.either(Effect.mapError(effect, ParseResult.TreeFormatter.formatErrorSync))))
    .toStrictEqual(
      Either.left(message)
    )
}

export const expectEffectSuccess = async <E, A>(effect: Effect.Effect<A, E>, a: A) => {
  expect(await Effect.runPromise(Effect.either(effect))).toStrictEqual(
    Either.right(a)
  )
}

export const expectEitherLeft = <A>(e: Either.Either<A, ParseResult.ParseError>, message: string) => {
  if (Either.isLeft(e)) {
    expect(ParseResult.TreeFormatter.formatErrorSync(e.left)).toStrictEqual(message)
  } else {
    // eslint-disable-next-line no-console
    console.log(e.right)
    assert.fail(`expected a Left`)
  }
}

export const expectEitherRight = <E, A>(e: Either.Either<A, E>, a: A) => {
  if (Either.isRight(e)) {
    expect(e.right).toStrictEqual(a)
  } else {
    // eslint-disable-next-line no-console
    console.log(e.left)
    assert.fail(`expected a Right`)
  }
}

export const expectNone = <A>(o: Option.Option<A>) => {
  expect(o).toStrictEqual(Option.none())
}

export const expectSome = <A>(o: Option.Option<A>, a: A) => {
  expect(o).toStrictEqual(Option.some(a))
}

export const AsyncDeclaration = S.declare(
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
  { strict: true, decode: (s) => Effect.andThen(Name, s), encode: (s) => Effect.andThen(Name, s) }
).annotations({ identifier: "DependencyString" })

export const expectFields = (f1: S.Struct.Fields, f2: S.Struct.Fields) => {
  const ks1 = Reflect.ownKeys(f1).sort().map((k) => [k, f1[k].ast.toString()])
  const ks2 = Reflect.ownKeys(f2).sort().map((k) => [k, f2[k].ast.toString()])
  expect(ks1).toStrictEqual(ks2)
}

export const expectAssertsSuccess = <A, I>(schema: S.Schema<A, I>, input: unknown, options?: ParseOptions) => {
  expect(S.asserts(schema, options)(input)).toEqual(undefined)
}

export const expectAssertsFailure = <A, I>(
  schema: S.Schema<A, I>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => {
  expect(() => S.asserts(schema, options)(input)).toThrow(new Error(message))
}

export const BooleanFromLiteral = S.transform(S.Literal("true", "false"), S.Boolean, {
  strict: true,
  decode: (l) => l === "true",
  encode: (b) => b ? "true" : "false"
})

export const Defect = S.transform(S.String, S.Object, {
  strict: true,
  decode: (s) => ({ input: s }),
  encode: (u) => JSON.stringify(u)
})
