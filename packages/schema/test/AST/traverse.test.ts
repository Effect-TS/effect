import * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST/traverseToBoundries", () => {
  it("should traverse 'primitives'", () => {
    expect(AST.traverseToBoundries(Schema.literal(1).ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.uniqueSymbol(Symbol.for("foo")).ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.undefined.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.void.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.never.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.unknown.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.any.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.string.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.number.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.boolean.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.bigintFromSelf.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.symbolFromSelf.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.object.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(Schema.enums({ "foo": "foo", "bar": "bar" }).ast)).toHaveLength(1)
  })

  it("Should traverse non 'primitives'", () => {
    expect(AST.traverseToBoundries(Schema.tuple(Schema.string, Schema.number).ast)).toHaveLength(3)
    expect(AST.traverseToBoundries(Schema.array(Schema.string).ast)).toHaveLength(2)
    expect(AST.traverseToBoundries(Schema.nullable(Schema.string).ast)).toHaveLength(3)
    expect(AST.traverseToBoundries(Schema.record(Schema.string, Schema.number).ast)).toHaveLength(2)
    expect(AST.traverseToBoundries(Schema.union(Schema.string, Schema.number).ast)).toHaveLength(3)
  })

  it("Should traverse outer suspended schemas", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown)
    expect(AST.traverseToBoundries(suspendedSchema.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(suspendedSchema.ast, { ignoreTopLevelIdentifierBoundry: true })).toHaveLength(1)
  })

  it("Should traverse inner suspended schemas", () => {
    const suspendedSchema = Schema.struct({ foo: Schema.suspend(() => Schema.unknown) })
    expect(AST.traverseToBoundries(suspendedSchema.ast)).toHaveLength(2)
    expect(AST.traverseToBoundries(suspendedSchema.ast, { ignoreTopLevelIdentifierBoundry: true })).toHaveLength(2)
  })

  it("Should traverse schemas with identifier annotations", () => {
    const annotatedSchema = Schema.unknown.pipe(Schema.identifier("Foo"))
    expect(AST.traverseToBoundries(annotatedSchema.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(annotatedSchema.ast, { ignoreTopLevelIdentifierBoundry: true })).toHaveLength(0)
  })

  it("Should traverse class schemas", () => {
    class A extends Schema.Class<A>()({
      a: Schema.unknown
    }) {}
    expect(AST.traverseToBoundries(A.ast)).toHaveLength(1)
    expect(AST.traverseToBoundries(A.ast, { ignoreTopLevelIdentifierBoundry: true })).toHaveLength(7)
  })
})

describe("AST/getInteriorNodes", () => {
  it("should get interior nodes of 'primitives'", () => {
    expect(AST.getInteriorNodes(Schema.literal(1).ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.uniqueSymbol(Symbol.for("foo")).ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.undefined.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.void.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.never.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.unknown.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.any.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.string.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.number.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.boolean.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.bigintFromSelf.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.symbolFromSelf.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.object.ast)).toHaveLength(1)
    expect(AST.getInteriorNodes(Schema.enums({ "foo": "foo", "bar": "bar" }).ast)).toHaveLength(1)
  })

  it("Should get interior nodes of non 'primitives'", () => {
    expect(AST.getInteriorNodes(Schema.tuple(Schema.string, Schema.number).ast)).toHaveLength(3)
    expect(AST.getInteriorNodes(Schema.array(Schema.string).ast)).toHaveLength(2)
    expect(AST.getInteriorNodes(Schema.nullable(Schema.string).ast)).toHaveLength(3)
    expect(AST.getInteriorNodes(Schema.record(Schema.string, Schema.number).ast)).toHaveLength(2)
    expect(AST.getInteriorNodes(Schema.union(Schema.string, Schema.number).ast)).toHaveLength(3)
  })

  it("Should get interior nodes of outer suspended schemas", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown)
    expect(AST.getInteriorNodes(suspendedSchema.ast)).toHaveLength(0)
  })

  it("Should get interior nodes of inner suspended schemas", () => {
    const suspendedSchema = Schema.struct({ foo: Schema.suspend(() => Schema.unknown) })
    expect(AST.getInteriorNodes(suspendedSchema.ast)).toEqual([suspendedSchema.ast])
  })

  it("Should get interior nodes of schemas with identifier annotations", () => {
    const annotatedSchema = Schema.unknown.pipe(Schema.identifier("Foo"))
    expect(AST.getInteriorNodes(annotatedSchema.ast)).toHaveLength(0)
  })

  it("Should get interior nodes of class schemas", () => {
    class A extends Schema.Class<A>()({
      a: Schema.unknown
    }) {}
    expect(AST.getInteriorNodes(A.ast)).toHaveLength(0)
  })
})

describe("AST/getPerimeterNodes", () => {
  it("should get perimiter nodes of 'primitives'", () => {
    expect(AST.getPerimeterNodes(Schema.literal(1).ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.uniqueSymbol(Symbol.for("foo")).ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.undefined.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.void.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.never.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.unknown.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.any.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.string.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.number.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.boolean.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.bigintFromSelf.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.symbolFromSelf.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.object.ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.enums({ "foo": "foo", "bar": "bar" }).ast)).toHaveLength(0)
  })

  it("Should get perimiter nodes of non 'primitives'", () => {
    expect(AST.getPerimeterNodes(Schema.tuple(Schema.string, Schema.number).ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.array(Schema.string).ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.nullable(Schema.string).ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.record(Schema.string, Schema.number).ast)).toHaveLength(0)
    expect(AST.getPerimeterNodes(Schema.union(Schema.string, Schema.number).ast)).toHaveLength(0)
  })

  it("Should get perimiter nodes of outer suspended schemas", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown)
    expect(AST.getPerimeterNodes(suspendedSchema.ast)).toHaveLength(1)
  })

  it("Should get perimiter nodes of inner suspended schemas", () => {
    const suspendedSchema = Schema.struct({ foo: Schema.suspend(() => Schema.unknown) })
    expect(AST.getPerimeterNodes(suspendedSchema.ast)).toHaveLength(1)
  })

  it("Should get perimiter nodes of schemas with identifier annotations", () => {
    const annotatedSchema = Schema.unknown.pipe(Schema.identifier("Foo"))
    expect(AST.getPerimeterNodes(annotatedSchema.ast)).toHaveLength(0)
  })

  it("Should get perimiter nodes of schemas with multiple different boundries", () => {
    const schema = Schema.struct({
      foo: Schema.suspend(() => Schema.unknown),
      bar: Schema.suspend(() => Schema.unknown),
      baz: Schema.suspend(() => Schema.unknown)
    })
    expect(AST.getPerimeterNodes(schema.ast)).toHaveLength(3)
  })

  it("Should get perimiter nodes of schemas with multiple same boundries", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown)
    const schema = Schema.struct({
      foo: suspendedSchema,
      bar: suspendedSchema,
      baz: suspendedSchema
    })
    expect(AST.getPerimeterNodes(schema.ast)).toHaveLength(1)
  })

  it("Should get perimiter nodes of schemas with multiple same boundries and identifiers", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown).pipe(Schema.identifier("b"))
    const schema = Schema.struct({
      foo: suspendedSchema.pipe(Schema.identifier("A")),
      bar: suspendedSchema,
      baz: suspendedSchema
    })
    expect(AST.getPerimeterNodes(schema.ast)).toHaveLength(2)
  })

  it("Should get perimiter nodes of class schemas", () => {
    class A extends Schema.Class<A>()({
      a: Schema.unknown
    }) {}
    expect(AST.getPerimeterNodes(A.ast)).toHaveLength(0)
  })

  it("Should get perimiter nodes of class schemas 2", () => {
    class A extends Schema.Class<A>()({
      a: Schema.unknown,
      b: Schema.unknown.pipe(Schema.identifier("B"))
    }) {}
    expect(AST.getPerimeterNodes(A.ast)).toHaveLength(1)
  })
})

describe("AST/getAllVerticies", () => {
  it("should get all verticies of 'primitives'", () => {
    expect(AST.getAllVerticies(Schema.literal(1).ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.uniqueSymbol(Symbol.for("foo")).ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.undefined.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.void.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.never.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.unknown.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.any.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.string.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.number.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.boolean.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.bigintFromSelf.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.symbolFromSelf.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.object.ast)).toHaveLength(1)
    expect(AST.getAllVerticies(Schema.enums({ "foo": "foo", "bar": "bar" }).ast)).toHaveLength(1)
  })

  it("Should get all verticies of non 'primitives'", () => {
    expect(AST.getAllVerticies(Schema.tuple(Schema.string, Schema.number).ast)).toHaveLength(3)
    expect(AST.getAllVerticies(Schema.array(Schema.string).ast)).toHaveLength(2)
    expect(AST.getAllVerticies(Schema.nullable(Schema.string).ast)).toHaveLength(3)
    expect(AST.getAllVerticies(Schema.record(Schema.string, Schema.number).ast)).toHaveLength(2)
    expect(AST.getAllVerticies(Schema.union(Schema.string, Schema.number).ast)).toHaveLength(3)
  })

  it("Should get all verticies of outer suspended schemas", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown)
    expect(AST.getAllVerticies(suspendedSchema.ast)).toHaveLength(2)
  })

  it("Should get all verticies of inner suspended schemas", () => {
    const suspendedSchema = Schema.struct({ foo: Schema.suspend(() => Schema.unknown) })
    expect(AST.getAllVerticies(suspendedSchema.ast)).toHaveLength(3)
  })

  it("Should get all verticies of schemas with identifier annotations", () => {
    const annotatedSchema = Schema.unknown.pipe(Schema.identifier("Foo"))
    expect(AST.getAllVerticies(annotatedSchema.ast)).toHaveLength(1)
  })

  it("Should get all verticies of schemas with multiple different boundries", () => {
    const schema = Schema.struct({
      foo: Schema.suspend(() => Schema.unknown),
      bar: Schema.suspend(() => Schema.unknown),
      baz: Schema.suspend(() => Schema.unknown)
    })
    expect(AST.getAllVerticies(schema.ast)).toHaveLength(5)
  })

  it("Should get all verticies of schemas with multiple same boundries", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown)
    const schema = Schema.struct({
      foo: suspendedSchema,
      bar: suspendedSchema,
      baz: suspendedSchema
    })
    expect(AST.getAllVerticies(schema.ast)).toHaveLength(3)
  })

  it("Should get all verticies of schemas with multiple same boundries and identifiers", () => {
    const suspendedSchema = Schema.suspend(() => Schema.unknown).pipe(Schema.identifier("b"))
    const schema = Schema.struct({
      foo: suspendedSchema.pipe(Schema.identifier("A")),
      bar: suspendedSchema,
      baz: suspendedSchema
    })
    expect(AST.getAllVerticies(schema.ast)).toHaveLength(4)
  })

  it("Should get all verticies of class schemas", () => {
    class A extends Schema.Class<A>()({
      a: Schema.unknown
    }) {}
    expect(AST.getAllVerticies(A.ast)).toHaveLength(5)
  })
})

// describe("AST/crossBoundry", () => {
//   it("should cross boundry of 'primitives'", () => {
//     expect(AST.crossBoundry(Schema.literal(1).ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.uniqueSymbol(Symbol.for("foo")).ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.undefined.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.void.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.never.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.unknown.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.any.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.string.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.number.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.boolean.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.bigintFromSelf.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.symbolFromSelf.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.object.ast)).toEqual(Option.none())
//     expect(AST.crossBoundry(Schema.enums({ "foo": "foo", "bar": "bar" }).ast)).toEqual(Option.none())
//   })
// })

describe("AST/isSelfReferencial", () => {
  it("basic not self referencial", () => {
    expect(AST.isSelfReferencial(Schema.string.ast)).toBe(false)
  })

  it("not self referencial", () => {
    const schema = Schema.struct({ foo: Schema.string, bar: Schema.number })
    const schema2 = Schema.struct({
      foo: Schema.suspend(() => schema).pipe(Schema.identifier("B")),
      bar: Schema.number
    }).pipe(Schema.identifier("A"))
    expect(AST.isSelfReferencial(schema2.ast)).toBe(false)
  })

  it("basic self referencial", () => {
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

    const both = Schema.struct({ foo: Expression, bar: Operation })

    expect(AST.isSelfReferencial(both.ast)).toBe(false)
    expect(AST.isSelfReferencial(Operation.ast)).toBe(true)
    expect(AST.isSelfReferencial(Expression.ast)).toBe(true)
  })

  it("stupid self referencial", () => {
    interface I1 {
      readonly value: I2
    }

    interface I2 {
      readonly value: I3
    }

    interface I3 {
      readonly value: I4
    }

    interface I4 {
      readonly value: I5
    }

    interface I5 {
      readonly value: I6
    }

    interface I6 {
      readonly value: I7
    }

    interface I7 {
      readonly value: I8
    }

    interface I8 {
      readonly value: I9
    }

    interface I9 {
      readonly value: I1
    }

    interface I10 {
      readonly value: I4
    }

    const schema1: Schema.Schema<I1> = Schema.suspend(() => Schema.struct({ value: schema2 }))
    const schema2: Schema.Schema<I2> = Schema.suspend(() => Schema.struct({ value: schema3 }))
    const schema3: Schema.Schema<I3> = Schema.suspend(() => Schema.struct({ value: schema4 }))
    const schema4: Schema.Schema<I4> = Schema.suspend(() => Schema.struct({ value: schema5 }))
    const schema5: Schema.Schema<I5> = Schema.suspend(() => Schema.struct({ value: schema6 }))
    const schema6: Schema.Schema<I6> = Schema.suspend(() => Schema.struct({ value: schema7 }))
    const schema7: Schema.Schema<I7> = Schema.suspend(() => Schema.struct({ value: schema8 }))
    const schema8: Schema.Schema<I8> = Schema.suspend(() => Schema.struct({ value: schema9 }))
    const schema9: Schema.Schema<I9> = Schema.suspend(() => Schema.struct({ value: schema1 }))
    const schema10: Schema.Schema<I10> = Schema.struct({ value: schema4 })

    expect(AST.isSelfReferencial(schema1.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema2.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema3.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema4.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema5.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema6.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema7.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema8.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema9.ast)).toBe(true)
    expect(AST.isSelfReferencial(schema10.ast)).toBe(false)
  })
})

describe("AST/partition", () => {
  it("simplist", () => {
    const schema = Schema.string.pipe(Schema.identifier("A")).ast
    const partition = [{ identifier: "A", ast: schema }]
    expect(AST.partition(schema)).toEqual([partition])
  })

  it("basic struct", () => {
    const schema = Schema.struct({
      foo: Schema.string,
      bar: Schema.number
    }).pipe(Schema.identifier("A")).ast

    const partition = [{ identifier: "A", ast: schema }]
    expect(AST.partition(schema)).toEqual([partition])
  })

  it("one boundry", () => {
    const schema1 = Schema.struct({
      foo: Schema.string,
      bar: Schema.number
    }).pipe(Schema.identifier("A"))

    const schema2 = Schema.struct({
      foo: Schema.suspend(() => schema1),
      bar: Schema.number
    }).pipe(Schema.identifier("B"))

    const partition1 = [{ identifier: "A", ast: schema1.ast }]
    const partition2 = [{ identifier: "B", ast: schema2.ast }]
    expect(AST.partition(schema1.ast)).toEqual([partition1])
    expect(AST.partition(schema2.ast)).toEqual([partition1, partition2])
  })

  it("two same boundries", () => {
    const schema = Schema.struct({
      foo: Schema.string,
      bar: Schema.number
    }).pipe(Schema.identifier("A"))

    const schema2 = Schema.struct({
      foo: Schema.suspend(() => schema),
      bar: Schema.suspend(() => schema)
    }).pipe(Schema.identifier("B"))

    const partition1 = [{ identifier: "A", ast: schema.ast }]
    const partition2 = [{ identifier: "B", ast: schema2.ast }]
    expect(AST.partition(schema2.ast)).toEqual([partition1, partition2])
  })

  it("two same boundries different identifiers", () => {
    const schema = Schema.struct({ foo: Schema.string, bar: Schema.number })
    const schema2 = Schema.struct({
      foo: Schema.suspend(() => schema).pipe(Schema.identifier("A")),
      bar: Schema.suspend(() => schema).pipe(Schema.identifier("B"))
    }).pipe(Schema.identifier("C"))
    const partition1 = [{ identifier: "A", ast: schema.ast }]
    const partition2 = [{ identifier: "B", ast: schema.ast }]
    const partition3 = [{ identifier: "C", ast: schema2.ast }]
    expect(AST.partition(schema2.ast)).toEqual([partition1, partition2, partition3])
  })

  it("two same primitive boundries", () => {
    const schema1 = Schema.string.pipe(Schema.identifier("A"))
    const schema2 = Schema.string.pipe(Schema.identifier("B"))
    const schema3 = Schema.struct({
      foo: Schema.suspend(() => schema1),
      bar: Schema.suspend(() => schema2)
    }).pipe(Schema.identifier("C"))

    const partition1 = [{ identifier: "A", ast: schema1.ast }]
    const partition2 = [{ identifier: "B", ast: schema2.ast }]
    const partition3 = [{ identifier: "C", ast: schema3.ast }]
    expect(AST.partition(schema3.ast)).toEqual([partition1, partition2, partition3])
  })

  it("outer suspended boundry", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: Schema.Schema<A> = Schema.suspend(() =>
      Schema.struct({
        a: Schema.string,
        as: Schema.array(schema)
      })
    ).pipe(Schema.identifier("A"))
    const partition1 = [{ identifier: "A", ast: schema.ast }]
    expect(AST.partition(schema.ast)).toEqual([partition1])
  })

  it.skip("inner suspended boundry", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: Schema.Schema<A> = Schema.struct({
      a: Schema.string,
      as: Schema.array(Schema.suspend(() => schema).pipe(Schema.identifier("B")))
    }).pipe(Schema.identifier("A"))
    console.log(AST.partition(schema.ast))
    expect(AST.partition(schema.ast)).toEqual([[schema.ast]])
  })

  it("circular boundries", () => {
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

    const both = Schema.struct({
      foo: Expression,
      bar: Operation
    }).pipe(Schema.identifier("Both"))

    const partition1 = { identifier: "Expression", ast: Expression.ast }
    const partition2 = { identifier: "Operation", ast: Operation.ast }
    const partition3 = { identifier: "Both", ast: both.ast }
    expect(AST.partition(Operation.ast)).toEqual([[partition1, partition2]])
    expect(AST.partition(Expression.ast)).toEqual([[partition2, partition1]])
    expect(AST.partition(both.ast)).toEqual([[partition2, partition1], [partition3]])
  })
})
