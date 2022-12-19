import type { TypeLambda } from "@fp-ts/core/HKT"
import type * as applicative from "@fp-ts/core/typeclass/Applicative"
import * as covariant from "@fp-ts/core/typeclass/Covariant"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type * as AST from "@fp-ts/schema/AST"
import * as DataOption from "@fp-ts/schema/data/Option"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import ts from "typescript"

const printNode = (node: ts.Node, printerOptions?: ts.PrinterOptions): string => {
  const sourceFile = ts.createSourceFile(
    "print.ts",
    "",
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  )
  const printer = ts.createPrinter(printerOptions)
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
}

const printNodes = (
  nodes: Writer<ts.TypeNode>,
  printerOptions?: ts.PrinterOptions
): ReadonlyArray<string> => {
  const [typeNode, declarations] = nodes
  return [...declarations, typeNode].map((node) => printNode(node, printerOptions))
}

const TypeScriptId: unique symbol = Symbol.for(
  "@fp-ts/schema/test/compiler/TypeScript"
)

type Writer<A> = readonly [A, ReadonlyArray<ts.Declaration>]

interface WriterLambda extends TypeLambda {
  readonly type: Writer<this["Target"]>
}

const map = <A, B>(f: (a: A) => B) => (self: Writer<A>): Writer<B> => [f(self[0]), self[1]]

const Applicative: applicative.Applicative<WriterLambda> = {
  imap: covariant.imap<WriterLambda>(map),
  map,
  product: (that) => (self) => [[self[0], that[0]], self[1].concat(that[1])],
  productMany: (collection) =>
    (self) => {
      const as = Array.from(collection)
      return [
        [self[0], ...as.map((a) => a[0])],
        RA.getMonoid<ts.Declaration>().combineAll(as.map((a) => a[1]))
      ]
    },
  productAll: (collection) => {
    const as = Array.from(collection)
    return [as.map((a) => a[0]), RA.getMonoid<ts.Declaration>().combineAll(as.map((a) => a[1]))]
  },
  of: (a) => [a, []]
}

interface TypeScript<A> extends S.Schema<A> {
  readonly nodes: Writer<ts.TypeNode>
}

const make = (ast: AST.AST, nodes: Writer<ts.TypeNode>): TypeScript<any> => ({ ast, nodes }) as any

const of: <A>(a: A) => Writer<A> = Applicative.of

const traverse: <A, B>(
  f: (a: A) => Writer<B>
) => (self: ReadonlyArray<A>) => Writer<ReadonlyArray<B>> = RA.traverse(Applicative)

const append = <B>(b: Writer<B>) =>
  <A>(
    as: Writer<ReadonlyArray<A>>
  ): Writer<ReadonlyArray<A | B>> => [[...as[0], b[0]], as[1].concat(b[1])]

const appendAll = <B>(bs: Writer<ReadonlyArray<B>>) =>
  <A>(
    as: Writer<ReadonlyArray<A>>
  ): Writer<ReadonlyArray<A | B>> => [[...as[0], ...bs[0]], as[1].concat(bs[1])]

const IdentifierAnnotationId = Symbol.for("@fp-ts/schema/test/compiler/TypeScript")

interface IdentifierAnnotation {
  readonly _id: typeof IdentifierAnnotationId
  readonly identifier: string
}

const isIdentifierAnnotation = (u: unknown): u is IdentifierAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === IdentifierAnnotationId

const identifierAnnotation = (identifier: string): IdentifierAnnotation => ({
  _id: IdentifierAnnotationId,
  identifier
})

const getIdentifier = (ast: AST.AST): O.Option<ts.Identifier> =>
  pipe(
    ast.annotations,
    RA.findFirst(isIdentifierAnnotation),
    O.map((annotation) => ts.factory.createIdentifier(annotation.identifier))
  )

const createSymbol = (description: string | undefined) =>
  ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier("Symbol"),
      "for"
    ),
    [],
    description === undefined ? [] : [ts.factory.createStringLiteral(description)]
  )

const getPropertyName = (ast: AST.Field): ts.PropertyName =>
  typeof ast.key === "symbol" ?
    ts.factory.createComputedPropertyName(createSymbol(ast.key.description)) :
    ts.factory.createIdentifier(String(ast.key))

const provideTypeScriptFor = (
  provider: Provider
) =>
  <A>(schema: S.Schema<A>): TypeScript<A> => {
    const go = (ast: AST.AST): TypeScript<any> => {
      switch (ast._tag) {
        case "TypeAliasDeclaration":
          return pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.find(TypeScriptId, ast.id),
            O.match(
              () =>
                pipe(
                  getIdentifier(ast),
                  O.match(
                    () => go(ast.type),
                    (id) =>
                      make(
                        ast,
                        pipe(
                          ast.typeParameters,
                          traverse((ast) => go(ast).nodes),
                          map((typeParameters) =>
                            ts.factory.createTypeReferenceNode(id, typeParameters)
                          )
                        )
                      )
                  )
                ),
              (handler) =>
                O.isSome(ast.config) ?
                  handler(ast.config.value)(...ast.typeParameters.map(go)) :
                  handler(...ast.typeParameters.map(go))
            )
          )
        case "LiteralType": {
          const literal = ast.literal
          if (typeof literal === "string") {
            return make(
              ast,
              of(ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(literal)))
            )
          } else if (typeof literal === "number") {
            return make(
              ast,
              of(ts.factory.createLiteralTypeNode(ts.factory.createNumericLiteral(literal)))
            )
          } else if (typeof literal === "boolean") {
            return literal === true ?
              make(ast, of(ts.factory.createLiteralTypeNode(ts.factory.createTrue()))) :
              make(ast, of(ts.factory.createLiteralTypeNode(ts.factory.createFalse())))
          } else if (typeof literal === "bigint") {
            return make(
              ast,
              of(
                ts.factory.createLiteralTypeNode(ts.factory.createBigIntLiteral(literal.toString()))
              )
            )
          } else {
            return make(ast, of(ts.factory.createLiteralTypeNode(ts.factory.createNull())))
          }
        }
        case "UniqueSymbol": {
          const id = pipe(
            getIdentifier(ast),
            O.getOrThrow(() =>
              new Error(`cannot find an indentifier for this unique symbol ${String(ast.symbol)}`)
            )
          )
          const typeNode = ts.factory.createTypeQueryNode(id)
          const declaration = ts.factory.createVariableDeclaration(
            id,
            undefined,
            undefined,
            createSymbol(ast.symbol.description)
          )
          return make(
            ast,
            [typeNode, [declaration]]
          )
        }
        case "UndefinedKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)))
        case "VoidKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)))
        case "NeverKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)))
        case "UnknownKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)))
        case "AnyKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)))
        case "StringKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)))
        case "NumberKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)))
        case "BooleanKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)))
        case "BigIntKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword)))
        case "SymbolKeyword":
          return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.SymbolKeyword)))
        case "Tuple": {
          let elements = pipe(
            ast.elements,
            traverse((e) =>
              pipe(
                go(e.type).nodes,
                map((element) =>
                  e.isOptional ? ts.factory.createOptionalTypeNode(element) : element
                )
              )
            )
          )
          if (O.isSome(ast.rest)) {
            const isArray = RA.isEmpty(ast.elements) && ast.rest.value.length === 1
            if (isArray) {
              return make(
                ast,
                pipe(
                  go(RA.headNonEmpty(ast.rest.value)).nodes,
                  map((item) => {
                    const arrayTypeNode = ts.factory.createArrayTypeNode(item)
                    return ast.isReadonly ?
                      ts.factory.createTypeOperatorNode(
                        ts.SyntaxKind.ReadonlyKeyword,
                        arrayTypeNode
                      ) :
                      arrayTypeNode
                  })
                )
              )
            } else {
              elements = pipe(
                elements,
                append(pipe(
                  go(RA.headNonEmpty(ast.rest.value)).nodes,
                  map((head) => ts.factory.createRestTypeNode(ts.factory.createArrayTypeNode(head)))
                )),
                appendAll(pipe(RA.tailNonEmpty(ast.rest.value), traverse((ast) => go(ast).nodes)))
              )
            }
          }
          return make(
            ast,
            pipe(
              elements,
              map((elements) => {
                const tuple = ts.factory.createTupleTypeNode(elements)
                return ast.isReadonly ?
                  ts.factory.createTypeOperatorNode(ts.SyntaxKind.ReadonlyKeyword, tuple) :
                  tuple
              })
            )
          )
        }
        case "Union":
          return make(
            ast,
            pipe(
              ast.members,
              traverse((ast) => go(ast).nodes),
              map((members) => ts.factory.createUnionTypeNode(members))
            )
          )
        case "Enums": {
          const id = pipe(
            getIdentifier(ast),
            O.getOrThrow(() => new Error("cannot find an indentifier for this native enum"))
          )
          const typeNode = ts.factory.createTypeQueryNode(id)
          const declaration = ts.factory.createEnumDeclaration(
            undefined,
            id,
            ast.enums.map(([key, value]) =>
              ts.factory.createEnumMember(
                key,
                typeof value === "string" ?
                  ts.factory.createStringLiteral(value) :
                  ts.factory.createNumericLiteral(value)
              )
            )
          )
          return make(
            ast,
            [typeNode, [declaration]]
          )
        }
        case "Struct":
          return make(
            ast,
            pipe(
              ast.fields,
              traverse(
                (field) =>
                  pipe(
                    go(field.value).nodes,
                    map((value) =>
                      ts.factory.createPropertySignature(
                        field.isReadonly ?
                          [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] :
                          undefined,
                        getPropertyName(field),
                        field.isOptional ?
                          ts.factory.createToken(ts.SyntaxKind.QuestionToken) :
                          undefined,
                        value
                      )
                    )
                  )
              ),
              appendAll(pipe(
                ast.indexSignatures,
                traverse((indexSignature) =>
                  pipe(
                    go(indexSignature.value).nodes,
                    map((value) =>
                      ts.factory.createIndexSignature(
                        indexSignature.isReadonly ?
                          [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] :
                          undefined,
                        [ts.factory.createParameterDeclaration(
                          undefined,
                          undefined,
                          "x",
                          undefined,
                          indexSignature.key === "string" ?
                            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword) :
                            ts.factory.createKeywordTypeNode(ts.SyntaxKind.SymbolKeyword)
                        )],
                        value
                      )
                    )
                  )
                )
              )),
              map((members) => ts.factory.createTypeLiteralNode(members))
            )
          )
        case "Lazy":
          throw new Error("Unhandled schema: TODO")
      }
    }

    return go(schema.ast)
  }

const provider: P.Provider = new Map([
  [
    TypeScriptId,
    new Map([
      [
        DataOption.id,
        <A>(typeParameter: TypeScript<A>): TypeScript<O.Option<A>> =>
          make(
            DataOption.schema(typeParameter).ast,
            pipe(
              typeParameter.nodes,
              map((typeParameter) => ts.factory.createTypeReferenceNode("Option", [typeParameter]))
            )
          )
      ]
    ])
  ]
])

const typeScriptFor = provideTypeScriptFor(P.empty())

describe.concurrent("TypeScript", () => {
  it("never", () => {
    const schema = S.never
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["never"])
  })

  it("undefined", () => {
    const schema = S.undefined
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["undefined"])
  })

  it("void", () => {
    const schema = S.void
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["void"])
  })

  it("string", () => {
    const schema = S.string
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["string"])
  })

  it("number", () => {
    const schema = S.number
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["number"])
  })

  it("boolean", () => {
    const schema = S.boolean
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["boolean"])
  })

  it("bigint", () => {
    const schema = S.bigint
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["bigint"])
  })

  it("symbol", () => {
    const schema = S.symbol
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["symbol"])
  })

  it("undefined", () => {
    const schema = S.undefined
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual(["undefined"])
  })

  describe.concurrent("literal", () => {
    it("string", () => {
      const schema = S.literal("a")
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`"a"`])
    })

    it("number", () => {
      const schema = S.literal(1)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual(["1"])
    })

    it("true", () => {
      const schema = S.literal(true)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`true`])
    })

    it("false", () => {
      const schema = S.literal(false)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`false`])
    })

    it("null", () => {
      const schema = S.literal(null)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`null`])
    })
  })

  it("uniqueSymbol", () => {
    const schema = pipe(
      S.uniqueSymbol(Symbol.for("@fp-ts/schema/test/a")),
      S.annotation(identifierAnnotation("a"))
    )
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual([`a = Symbol.for("@fp-ts/schema/test/a")`, `typeof a`])
  })

  it("enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = pipe(S.enums(Fruits), S.annotation(identifierAnnotation("Fruits")))
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual([
      `enum Fruits {
    Apple = 0,
    Banana = 1
}`,
      `typeof Fruits`
    ])
  })

  describe.concurrent("tuple", () => {
    it("required element", () => {
      const schema = S.tuple(S.number)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    number
]`])
    })

    it("required element with undefined", () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    number | undefined
]`])
    })

    it("optional element", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.number))
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    number?
]`])
    })

    it("optional element with undefined", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    (number | undefined)?
]`])
    })

    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    string,
    number
]`])
    })

    it("empty tuple", () => {
      const schema = S.tuple()
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
]`])
    })

    it("optional elements", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    string?,
    number?
]`])
    })

    it("array", () => {
      const schema = S.array(S.string)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly string[]`])
    })

    it("post rest element", () => {
      const schema = pipe(S.array(S.number), S.element(S.boolean))
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    ...number[],
    boolean
]`])
    })

    it("post rest elements", () => {
      const schema = pipe(
        S.array(S.number),
        S.element(S.boolean),
        S.element(S.union(S.string, S.undefined))
      )
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    ...number[],
    boolean,
    string | undefined
]`])
    })

    it("post rest elements when rest is unknown", () => {
      const schema = pipe(S.array(S.unknown), S.element(S.boolean))
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    ...unknown[],
    boolean
]`])
    })

    it("all", () => {
      const schema = pipe(
        S.tuple(S.string),
        S.rest(S.number),
        S.element(S.boolean)
      )
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    string,
    ...number[],
    boolean
]`])
    })

    it("all with symbols", () => {
      const schema = pipe(
        S.tuple(
          pipe(
            S.uniqueSymbol(Symbol.for("@fp-ts/schema/test/a")),
            S.annotation(identifierAnnotation("a"))
          )
        ),
        S.rest(pipe(
          S.uniqueSymbol(Symbol.for("@fp-ts/schema/test/b")),
          S.annotation(identifierAnnotation("b"))
        )),
        S.element(pipe(
          S.uniqueSymbol(Symbol.for("@fp-ts/schema/test/c")),
          S.annotation(identifierAnnotation("c"))
        ))
      )
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([
        `a = Symbol.for("@fp-ts/schema/test/a")`,
        `b = Symbol.for("@fp-ts/schema/test/b")`,
        `c = Symbol.for("@fp-ts/schema/test/c")`,
        `readonly [
    typeof a,
    ...(typeof b)[],
    typeof c
]`
      ])
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.number)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly [
    number,
    ...number[]
]`])
    })

    it("ReadonlyArray<unknown>", () => {
      const schema = S.array(S.unknown)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly unknown[]`])
    })

    it("ReadonlyArray<any>", () => {
      const schema = S.array(S.any)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`readonly any[]`])
    })
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const schema = S.struct({ a: S.number })
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly a: number;
}`])
    })

    it("required field with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly a: number | undefined;
}`])
    })

    it("optional field", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly a?: number;
}`])
    })

    it("optional field with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly a?: number | undefined;
}`])
    })

    it("{ readonly [x: string]: unknown }", () => {
      const schema = S.stringIndexSignature(S.unknown)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly [x: string]: unknown;
}`])
    })

    it("{ readonly [x: string]: any }", () => {
      const schema = S.stringIndexSignature(S.any)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly [x: string]: any;
}`])
    })

    it("stringIndexSignature", () => {
      const schema = S.stringIndexSignature(S.string)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly [x: string]: string;
}`])
    })

    it("symbolIndexSignature", () => {
      const schema = S.symbolIndexSignature(S.string)
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([`{
    readonly [x: symbol]: string;
}`])
    })

    it("all with symbols", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = pipe(
        S.struct({
          [a]: pipe(S.uniqueSymbol(b), S.annotation(identifierAnnotation("b"))),
          c: S.number
        }),
        S.extend(
          S.stringIndexSignature(
            pipe(
              S.uniqueSymbol(Symbol.for("@fp-ts/schema/test/d")),
              S.annotation(identifierAnnotation("d"))
            )
          )
        )
      )
      const node = typeScriptFor(schema)
      expect(printNodes(node.nodes)).toEqual([
        `b = Symbol.for("@fp-ts/schema/test/b")`,
        `d = Symbol.for("@fp-ts/schema/test/d")`,
        `{
    readonly [Symbol.for("@fp-ts/schema/test/a")]: typeof b;
    readonly c: number;
    readonly [x: string]: typeof d;
}`
      ])
    })
  })

  it("union", () => {
    const schema = S.union(
      S.string,
      S.number,
      pipe(
        S.uniqueSymbol(Symbol.for("@fp-ts/schema/test/a")),
        S.annotation(identifierAnnotation("a"))
      )
    )
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual([
      `a = Symbol.for("@fp-ts/schema/test/a")`,
      `string | number | typeof a`
    ])
  })

  it("Option (by Provider)", () => {
    const typeScriptFor = provideTypeScriptFor(provider)
    const schema = S.option(S.struct({ a: S.string }))
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual([`Option<{
    readonly a: string;
}>`])
  })

  it("Option (by annotation)", () => {
    const option = <A>(value: S.Schema<A>): S.Schema<O.Option<A>> =>
      pipe(DataOption.schema(value), S.annotation(identifierAnnotation("Option")))
    const schema = option(S.struct({ a: S.string }))
    const node = typeScriptFor(schema)
    expect(printNodes(node.nodes)).toEqual([`Option<{
    readonly a: string;
}>`])
  })

  it("example: compile to TypeScript AST", () => {
    const schema = S.struct({
      name: S.string,
      age: S.number
    })
    // const typeNode: ts.TypeNode
    const { nodes } = typeScriptFor(schema)
    expect(printNodes(nodes)).toEqual([`{
    readonly name: string;
    readonly age: number;
}`])
  })
})
