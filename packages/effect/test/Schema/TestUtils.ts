import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { getFinalTransformation } from "effect/ParseResult"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import * as AST from "effect/SchemaAST"
import { assert, expect } from "vitest"
import * as SchemaTest from "./SchemaTest.js"

export const assertions = Effect.runSync(
  SchemaTest.assertions.pipe(
    Effect.provideService(SchemaTest.Assert, {
      deepStrictEqual: (actual, expected) => expect(actual).toStrictEqual(expected),
      throws: (fn, message) => expect(fn).toThrow(new Error(message)),
      fail: (message) => assert.fail(message)
    }),
    Effect.provideService(SchemaTest.AssertConfig, {
      arbitrary: {
        validateGeneratedValues: {
          skip: true
        }
      },
      testRoundtripConsistency: {
        skip: true
      }
    })
  )
)

export const onExcessPropertyError: ParseOptions = {
  onExcessProperty: "error"
}

export const onExcessPropertyPreserve: ParseOptions = {
  onExcessProperty: "preserve"
}

export const ErrorsAll: ParseOptions = {
  errors: "all"
}

export const NumberFromChar = S.Char.pipe(S.compose(S.NumberFromString)).annotations({
  identifier: "NumberFromChar"
})

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

// TODO: replace with S.BooleanFromString
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

function effectifyDecode<R>(
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
) => Effect.Effect<any, ParseResult.ParseIssue, R> {
  return (fromA, options, ast, fromI) =>
    ParseResult.flatMap(Effect.sleep("10 millis"), () => decode(fromA, options, ast, fromI))
}

function effectifyAST(ast: AST.AST): AST.AST {
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
      (a, options) =>
        Effect.flatMap(Effect.sleep("10 millis"), () => ParseResult.mapError(decode(a, options), (e) => e.issue)),
      (a, options) =>
        Effect.flatMap(Effect.sleep("10 millis"), () => ParseResult.mapError(encode(a, options), (e) => e.issue))
    )
  )
}

function effectify<A, I>(schema: S.Schema<A, I, never>): S.Schema<A, I, never> {
  return S.make(effectifyAST(schema.ast))
}
