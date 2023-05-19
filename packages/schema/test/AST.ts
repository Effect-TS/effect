import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("AST", () => {
  it("createIndexSignature/ should throw on unsupported ASTs", () => {
    expect(() => AST.createIndexSignature(AST.booleanKeyword, AST.stringKeyword, true))
      .toThrowError(
        new Error(
          `An index signature parameter type must be 'string', 'symbol', a template literal type or a refinement of the previous types`
        )
      )
  })

  it("createTemplateLiteral/ should return a literal if there are no template literal spans", () => {
    expect(AST.createTemplateLiteral("a", [])).toEqual(AST.createLiteral("a"))
  })

  it("union/ should remove never from members", () => {
    expect(AST.createUnion([AST.neverKeyword, AST.neverKeyword])).toEqual(
      AST.neverKeyword
    )
    expect(AST.createUnion([AST.neverKeyword, AST.stringKeyword])).toEqual(AST.stringKeyword)
    expect(AST.createUnion([AST.stringKeyword, AST.neverKeyword])).toEqual(AST.stringKeyword)
    expect(
      AST.createUnion([
        AST.neverKeyword,
        AST.stringKeyword,
        AST.neverKeyword,
        AST.numberKeyword
      ])
    )
      .toEqual(AST.createUnion([AST.stringKeyword, AST.numberKeyword]))
  })

  it("createRecord/ numeric literal", () => {
    expect(AST.createRecord(AST.createLiteral(1), AST.numberKeyword, true)).toEqual(
      AST.createTypeLiteral([AST.createPropertySignature(1, AST.numberKeyword, false, true)], [])
    )
  })

  it("createRecord/ should throw on unsupported keys", () => {
    expect(() => AST.createRecord(AST.undefinedKeyword, AST.numberKeyword, true)).toThrowError(
      new Error("createRecord: unsupported key UndefinedKeyword")
    )
  })

  it("createRecord/ should throw on unsupported literals", () => {
    expect(() => AST.createRecord(AST.createLiteral(true), AST.numberKeyword, true)).toThrowError(
      new Error("createRecord: unsupported literal true")
    )
  })

  it("union/ should unify any with anything", () => {
    expect(S.union(S.literal("a"), S.any).ast).toEqual(S.any.ast)
  })

  it("union/ should unify unknown with anything", () => {
    expect(S.union(S.literal("a"), S.unknown).ast).toEqual(S.unknown.ast)
  })

  it("union/ should unify string literals with string", () => {
    expect(S.union(S.literal("a"), S.string).ast).toEqual(S.string.ast)
  })

  it("union/ should unify number literals with number", () => {
    expect(S.union(S.literal(1), S.number).ast).toEqual(S.number.ast)
  })

  it("union/ should unify boolean literals with boolean", () => {
    expect(S.union(S.literal(true), S.boolean).ast).toEqual(S.boolean.ast)
  })

  it("union/ should unify bigint literals with bigint", () => {
    expect(S.union(S.literal(1n), S.bigint).ast).toEqual(S.bigint.ast)
  })

  it("union/ should unify symbol literals with symbol", () => {
    expect(S.union(S.uniqueSymbol(Symbol.for("@effect/schema/test/a")), S.symbol).ast).toEqual(
      S.symbol.ast
    )
  })

  describe.concurrent("union/ should give precedence to schemas containing more infos", () => {
    it("1 required vs 2 required", () => {
      const a = S.struct({ a: S.string })
      const ab = S.struct({ a: S.string, b: S.number })
      const schema = S.union(a, ab)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [ab.ast, a.ast],
        annotations: {}
      })
    })

    it("1 required vs 2 optional", () => {
      const a = S.struct({ a: S.string })
      const ab = S.struct({ a: S.optional(S.string), b: S.optional(S.number) })
      const schema = S.union(a, ab)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [ab.ast, a.ast],
        annotations: {}
      })
    })

    it("struct({}) should go in last position in a union", () => {
      const a = S.object
      const b = S.struct({})
      const schema = S.union(b, a)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [a.ast, b.ast],
        annotations: {}
      })
    })

    it("object precedence should be low", () => {
      const a = S.tuple()
      const b = S.object
      const schema = S.union(b, a)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [a.ast, b.ast],
        annotations: {}
      })
    })
  })

  it("partial/tuple/ e", () => {
    // type A = [string]
    // type B = Partial<A>
    const tuple = AST.createTuple([AST.createElement(AST.stringKeyword, false)], O.none(), true)
    expect(AST.partial(tuple)).toEqual(
      AST.createTuple([AST.createElement(AST.stringKeyword, true)], O.none(), true)
    )
  })

  it("partial/tuple/ e + r", () => {
    // type A = readonly [string, ...Array<number>]
    // type B = Partial<A>
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      O.some([AST.numberKeyword]),
      true
    )
    expect(AST.partial(tuple)).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, true)],
        O.some([AST.createUnion([AST.numberKeyword, AST.undefinedKeyword])]),
        true
      )
    )
  })

  it("partial/tuple/ e + r + e", () => {
    // type A = readonly [string, ...Array<number>, boolean]
    // type B = Partial<A>
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      O.some([AST.numberKeyword, AST.booleanKeyword]),
      true
    )
    expect(AST.partial(tuple)).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, true)],
        O.some([AST.createUnion([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword])]),
        true
      )
    )
  })

  it("appendRestElement/ should add a rest element", () => {
    const tuple = AST.createTuple([AST.createElement(AST.stringKeyword, false)], O.none(), true)
    const actual = AST.appendRestElement(tuple, AST.numberKeyword)
    expect(actual).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, false)],
        O.some([AST.numberKeyword]),
        true
      )
    )
  })

  it("appendRestElement/ multiple `rest` calls must throw", () => {
    expect(() =>
      AST.appendRestElement(
        AST.appendRestElement(
          AST.createTuple([AST.createElement(AST.stringKeyword, false)], O.none(), true),
          AST.numberKeyword
        ),
        AST.booleanKeyword
      )
    ).toThrowError(new Error("A rest element cannot follow another rest element. ts(1265)"))
  })

  it("appendElement/ should append an element (rest element)", () => {
    const tuple = AST.createTuple([AST.createElement(AST.stringKeyword, false)], O.none(), true)
    expect(AST.appendElement(tuple, AST.createElement(AST.numberKeyword, false))).toEqual(
      AST.createTuple(
        [
          AST.createElement(AST.stringKeyword, false),
          AST.createElement(AST.numberKeyword, false)
        ],
        O.none(),
        true
      )
    )
  })

  it("appendElement/ should append an element (existing rest element)", () => {
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      O.some([AST.numberKeyword]),
      true
    )
    expect(AST.appendElement(tuple, AST.createElement(AST.booleanKeyword, false))).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, false)],
        O.some([AST.numberKeyword, AST.booleanKeyword]),
        true
      )
    )
  })

  it("appendElement/ A required element cannot follow an optional element", () => {
    const tuple = AST.createTuple([AST.createElement(AST.stringKeyword, true)], O.none(), true)
    expect(() => AST.appendElement(tuple, AST.createElement(AST.numberKeyword, false)))
      .toThrowError(
        new Error("A required element cannot follow an optional element. ts(1257)")
      )
  })

  it("appendElement/ An optional element cannot follow a rest element", () => {
    const tuple = AST.createTuple([], O.some([AST.stringKeyword]), true)
    expect(() => AST.appendElement(tuple, AST.createElement(AST.numberKeyword, true)))
      .toThrowError(
        new Error("An optional element cannot follow a rest element. ts(1266)")
      )
  })

  describe.concurrent("struct/ should give precedence to property signatures / index signatures containing less inhabitants", () => {
    it("literal vs string", () => {
      const schema = S.struct({ a: S.string, b: S.literal("b") })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          AST.createPropertySignature("b", AST.createLiteral("b"), false, true),
          AST.createPropertySignature("a", AST.stringKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })

    it("undefined vs string", () => {
      const schema = S.struct({ a: S.string, b: S.undefined })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          AST.createPropertySignature("b", AST.undefinedKeyword, false, true),
          AST.createPropertySignature("a", AST.stringKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })

    it("boolean vs string", () => {
      const schema = S.struct({ a: S.string, b: S.boolean })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          AST.createPropertySignature("b", AST.booleanKeyword, false, true),
          AST.createPropertySignature("a", AST.stringKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })

    it("literal vs boolean", () => {
      const schema = S.struct({ a: S.boolean, b: S.literal(null) })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          AST.createPropertySignature("b", AST.createLiteral(null), false, true),
          AST.createPropertySignature("a", AST.booleanKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })
  })

  it("createLazy should memoize the thunk", async () => {
    let log = 0
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.lazy(() => {
      log++
      return S.struct({
        a: S.string,
        as: S.array(schema)
      })
    })
    await Util.expectParseSuccess(schema, { a: "a1", as: [] })
    await Util.expectParseSuccess(schema, { a: "a1", as: [{ a: "a2", as: [] }] })
    expect(log).toEqual(1)
  })
})
