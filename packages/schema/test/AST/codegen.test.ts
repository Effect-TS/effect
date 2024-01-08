import * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST/codegen", () => {
  it("any", () => {
    const schema = Schema.any
    expect(AST.codegen(schema.ast)).toEqual("import * as S from \"effect/schema/Schema\"\n\nS.any")
  })

  it("void", () => {
    const schema = Schema.void
    expect(AST.codegen(schema.ast)).toEqual("S.void")
  })

  it("never", () => {
    const schema = Schema.never
    expect(AST.codegen(schema.ast)).toEqual("S.never")
  })

  it("bigint", () => {
    const schema = Schema.bigint
    expect(AST.codegen(schema.ast)).toEqual("S.bigint")
  })

  it("number", () => {
    const schema = Schema.number
    expect(AST.codegen(schema.ast)).toEqual("S.number")
  })

  it("string", () => {
    const schema = Schema.string
    expect(AST.codegen(schema.ast)).toEqual("S.string")
  })

  it("Object", () => {
    const schema = Schema.object
    expect(AST.codegen(schema.ast)).toEqual("S.object")
  })

  it("symbol", () => {
    const schema = Schema.symbol
    expect(AST.codegen(schema.ast)).toEqual("S.symbol")
  })

  it("boolean", () => {
    const schema = Schema.boolean
    expect(AST.codegen(schema.ast)).toEqual("S.boolean")
  })

  it("unknown", () => {
    const schema = Schema.unknown
    expect(AST.codegen(schema.ast)).toEqual("S.unknown")
  })

  it("undefined", () => {
    const schema = Schema.undefined
    expect(AST.codegen(schema.ast)).toEqual("S.undefined")
  })

  it("null", () => {
    const schema = Schema.null
    expect(AST.codegen(schema.ast)).toEqual("S.literal(null)")
  })

  it("literal string", () => {
    const schema = Schema.literal("foo")
    expect(AST.codegen(schema.ast)).toEqual("S.literal(\"foo\")")
  })

  it("literal number", () => {
    const schema = Schema.literal(42)
    expect(AST.codegen(schema.ast)).toEqual("S.literal(42)")
  })

  it("literal boolean", () => {
    const schema = Schema.literal(true)
    expect(AST.codegen(schema.ast)).toEqual("S.literal(true)")
  })

  it("literal bigint", () => {
    const schema = Schema.literal(42n)
    expect(AST.codegen(schema.ast)).toEqual("S.literal(42n)")
  })

  it("literal null", () => {
    const schema = Schema.literal(null)
    expect(AST.codegen(schema.ast)).toEqual("S.literal(null)")
  })

  it("symbol from self", () => {
    const schema = Schema.symbolFromSelf
    expect(AST.codegen(schema.ast)).toEqual("S.symbolFromSelf")
  })

  it("bigint from self", () => {
    const schema = Schema.bigintFromSelf
    expect(AST.codegen(schema.ast)).toEqual("S.bigintFromSelf")
  })

  it("unique symbol", () => {
    const schema = Schema.uniqueSymbol(Symbol.for("foo")).pipe(Schema.identifier("foo"))
    expect(AST.codegen(schema.ast)).toEqual(`export const foo = Symbol.for("foo")\n\nS.uniqueSymbol(foo)`)
  })

  it.only("should codegen mutually suspended schemas", () => {
    interface Expression {
      readonly type: "expression"
      readonly value: number | Operation
    }

    interface Operation {
      readonly type: "operation"
      readonly operator: "+" | "-"
      readonly left: Expression
      readonly right: Expression
    }

    const JsonNumber = Schema.number.pipe(
      Schema.filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
        jsonSchema: { type: "number" }
      })
    )

    const Expression: Schema.Schema<Expression> = Schema.suspend(() =>
      Schema.struct({
        type: Schema.literal("expression"),
        value: Schema.union(JsonNumber, Operation)
      })
    ).pipe(Schema.identifier("Expression"))

    const Operation: Schema.Schema<Operation> = Schema.suspend(() =>
      Schema.struct({
        type: Schema.literal("operation"),
        operator: Schema.union(Schema.literal("+"), Schema.literal("-")),
        left: Expression,
        right: Expression
      })
    ).pipe(Schema.identifier("Operation"))

    const code = AST.codegen(Expression.ast)
    // console.log(code)
    expect(code).toEqual(`import * as S from "effect/schema/Schema"

export const Operation = S.S.struct({
  /** undefined */
  type: S.literal("operation"),
  /** undefined */
  operator: S.union(S.literal("+"), S.literal("-")),
  /** undefined */
  left: S.suspend(() => Expression),
  /** undefined */
  right: S.suspend(() => Expression)
})

export const Expression = S.S.struct({
  /** undefined */
  type: S.literal("expression"),
  /** undefined */
  value: S.union(S.suspend(() => Operation), S.unknown)
})`)
  })
})
