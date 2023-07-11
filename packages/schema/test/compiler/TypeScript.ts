import { dual, pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
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

type Writer<A> = readonly [A, ReadonlyArray<ts.Declaration>]

// interface WriterLambda extends TypeLambda {
//   readonly type: Writer<this["Target"]>
// }

const map: {
  <A, B>(f: (a: A) => B): (self: Writer<A>) => Writer<B>
  <A, B>(self: Writer<A>, f: (a: A) => B): Writer<B>
} = dual<
  <A, B>(f: (a: A) => B) => (self: Writer<A>) => Writer<B>,
  <A, B>(self: Writer<A>, f: (a: A) => B) => Writer<B>
>(2, (self, f) => [f(self[0]), self[1]])

const product = <A, B>(
  self: Writer<A>,
  that: Writer<B>
): Writer<[A, B]> => [[self[0], that[0]], self[1].concat(that[1])]

interface TypeScript<To> extends S.Schema<To> {
  readonly nodes: Writer<ts.TypeNode>
}

const make = (ast: AST.AST, nodes: Writer<ts.TypeNode>): TypeScript<any> => ({ ast, nodes }) as any

const of = <A>(a: A): Writer<A> => [a, []]

const traverse = <A, B>(
  f: (a: A) => Writer<B>
) =>
  (self: ReadonlyArray<A>): Writer<ReadonlyArray<B>> => {
    const out: Array<B> = []
    const declarations: Array<ts.Declaration> = []
    for (const a of self) {
      const [b, declaration] = f(a)
      out.push(b)
      declarations.push(...declaration)
    }
    return [out, declarations]
  }

const append = <B>(b: Writer<B>) =>
  <A>(
    as: Writer<ReadonlyArray<A>>
  ): Writer<ReadonlyArray<A | B>> => [[...as[0], b[0]], as[1].concat(b[1])]

const appendAll = <B>(bs: Writer<ReadonlyArray<B>>) =>
  <A>(
    as: Writer<ReadonlyArray<A>>
  ): Writer<ReadonlyArray<A | B>> => [[...as[0], ...bs[0]], as[1].concat(bs[1])]

const getIdentifier = AST.getAnnotation<AST.IdentifierAnnotation>(
  AST.IdentifierAnnotationId
)

const addJsDocComment = (node: ts.Node, documentation: string): void => {
  ts.addSyntheticLeadingComment(
    node,
    ts.SyntaxKind.MultiLineCommentTrivia,
    `* ${documentation} `,
    true
  )
}

const addDocumentationOf = (annotated: AST.Annotated) =>
  <N extends ts.Node>(node: N): N => {
    const documentation = getDocumentationAnnotation(annotated)
    if (O.isSome(documentation)) {
      addJsDocComment(node, documentation.value)
    }
    return node
  }

const createSymbol = (description: string | undefined) =>
  ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier("Symbol"),
      "for"
    ),
    [],
    description === undefined ? [] : [ts.factory.createStringLiteral(description)]
  )

const getPropertyName = (ast: AST.PropertySignature): ts.PropertyName =>
  typeof ast.name === "symbol" ?
    ts.factory.createComputedPropertyName(createSymbol(ast.name.description)) :
    ts.factory.createIdentifier(String(ast.name))

const getDocumentationAnnotation = AST.getAnnotation<AST.DocumentationAnnotation>(
  AST.DocumentationAnnotationId
)

const typeScriptFor = <A>(schema: S.Schema<A>): TypeScript<A> => {
  const go = (ast: AST.AST): TypeScript<any> => {
    switch (ast._tag) {
      case "Declaration":
        return pipe(
          getIdentifier(ast),
          O.match({
            onNone: () => go(ast.type),
            onSome: (id) =>
              make(
                ast,
                pipe(
                  ast.typeParameters,
                  traverse((ast) => go(ast).nodes),
                  map((typeParameters) => ts.factory.createTypeReferenceNode(id, typeParameters))
                )
              )
          })
        )
      case "Literal": {
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
          O.map((id) => ts.factory.createIdentifier(id)),
          O.getOrThrowWith(() =>
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
      case "ObjectKeyword":
        return make(ast, of(ts.factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword)))
      case "Tuple": {
        let elements = pipe(
          ast.elements,
          traverse((e) =>
            pipe(
              go(e.type).nodes,
              map((element) => e.isOptional ? ts.factory.createOptionalTypeNode(element) : element)
            )
          )
        )
        if (O.isSome(ast.rest)) {
          const isArray = RA.isEmptyReadonlyArray(ast.elements) && ast.rest.value.length === 1
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
            ast.types,
            traverse((ast) => go(ast).nodes),
            map((members) => ts.factory.createUnionTypeNode(members))
          )
        )
      case "TypeLiteral":
        return make(
          ast,
          pipe(
            ast.propertySignatures,
            traverse(
              (ps) =>
                pipe(
                  go(ps.type).nodes,
                  map((type) =>
                    ts.factory.createPropertySignature(
                      ps.isReadonly ?
                        [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] :
                        undefined,
                      getPropertyName(ps),
                      ps.isOptional ?
                        ts.factory.createToken(ts.SyntaxKind.QuestionToken) :
                        undefined,
                      type
                    )
                  ),
                  map(addDocumentationOf(ps))
                )
            ),
            appendAll(pipe(
              ast.indexSignatures,
              traverse((indexSignature) =>
                pipe(
                  product(
                    go(indexSignature.parameter).nodes,
                    go(indexSignature.type).nodes
                  ),
                  map(([key, value]) =>
                    ts.factory.createIndexSignature(
                      indexSignature.isReadonly ?
                        [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] :
                        undefined,
                      [ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "x",
                        undefined,
                        key
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
        throw new Error("Unhandled schema")
      case "Enums": {
        const id = pipe(
          getIdentifier(ast),
          O.map((id) => ts.factory.createIdentifier(id)),
          O.getOrThrowWith(() => new Error(`cannot find an indentifier for this enum`))
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
      case "TemplateLiteral": {
        const spans: Array<ts.TemplateLiteralTypeSpan> = []
        for (let i = 0; i < ast.spans.length; i++) {
          spans.push(ts.factory.createTemplateLiteralTypeSpan(
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            i < ast.spans.length - 1 ?
              ts.factory.createTemplateMiddle(ast.spans[i].literal) :
              ts.factory.createTemplateTail(ast.spans[i].literal)
          ))
        }
        return make(
          ast,
          of(ts.factory.createTemplateLiteralType(
            ts.factory.createTemplateHead(ast.head),
            spans
          ))
        )
      }
      case "Refinement":
        return go(ast.from)
      case "Transform":
        return go(ast.to)
    }
  }

  return go(schema.ast)
}

describe.concurrent("TypeScript", () => {
  it("templateLiteral. a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([`"a"`])
  })

  it("templateLiteral. a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([`"a b"`])
  })

  it("templateLiteral. a${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["`a${string}`"])
  })

  it("templateLiteral. ${string}", () => {
    const schema = S.templateLiteral(S.string)
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["`${string}`"])
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["`a${string}b`"])
  })

  it("templateLiteral. https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html", () => {
    const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
    const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")
    const schema = S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([
      `"welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"`
    ])
  })

  it("never", () => {
    const schema = S.never
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["never"])
  })

  it("undefined", () => {
    const schema = S.undefined
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["undefined"])
  })

  it("void", () => {
    const schema = S.void
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["void"])
  })

  it("string", () => {
    const schema = S.string
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["string"])
  })

  it("number", () => {
    const schema = S.number
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["number"])
  })

  it("boolean", () => {
    const schema = S.boolean
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["boolean"])
  })

  it("bigint", () => {
    const schema = S.bigint
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["bigint"])
  })

  it("symbol", () => {
    const schema = S.symbol
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["symbol"])
  })

  it("object", () => {
    const schema = S.object
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["object"])
  })

  it("undefined", () => {
    const schema = S.undefined
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual(["undefined"])
  })

  describe.concurrent("literal", () => {
    it("string", () => {
      const schema = S.literal("a")
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`"a"`])
    })

    it("number", () => {
      const schema = S.literal(1)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual(["1"])
    })

    it("true", () => {
      const schema = S.literal(true)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`true`])
    })

    it("false", () => {
      const schema = S.literal(false)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`false`])
    })

    it("null", () => {
      const schema = S.literal(null)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`null`])
    })
  })

  it("uniqueSymbol", () => {
    const schema = S.uniqueSymbol(Symbol.for("@effect/schema/test/a"), {
      [AST.IdentifierAnnotationId]: "a"
    })
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([`a = Symbol.for("@effect/schema/test/a")`, `typeof a`])
  })

  it("enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits).pipe(S.identifier("Fruits"))
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([
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
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    number
]`])
    })

    it("required element with undefined", () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    number | undefined
]`])
    })

    it("optional element", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.number))
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    number?
]`])
    })

    it("optional element with undefined", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.union(S.number, S.undefined)))
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    (number | undefined)?
]`])
    })

    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    string,
    number
]`])
    })

    it("empty tuple", () => {
      const schema = S.tuple()
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
]`])
    })

    it("optional elements", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.string), S.optionalElement(S.number))
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    string?,
    number?
]`])
    })

    it("array", () => {
      const schema = S.array(S.string)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly string[]`])
    })

    it("post rest element", () => {
      const schema = S.array(S.number).pipe(S.element(S.boolean))
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    ...number[],
    boolean
]`])
    })

    it("post rest elements", () => {
      const schema = S.array(S.number).pipe(
        S.element(S.boolean),
        S.element(S.union(S.string, S.undefined))
      )
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    ...number[],
    boolean,
    string | undefined
]`])
    })

    it("post rest elements when rest is unknown", () => {
      const schema = S.array(S.unknown).pipe(S.element(S.boolean))
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    ...unknown[],
    boolean
]`])
    })

    it("all", () => {
      const schema = S.tuple(S.string).pipe(
        S.rest(S.number),
        S.element(S.boolean)
      )
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    string,
    ...number[],
    boolean
]`])
    })

    it("all with symbols", () => {
      const schema = S.tuple(
        S.uniqueSymbol(Symbol.for("@effect/schema/test/a"), {
          [AST.IdentifierAnnotationId]: "a"
        })
      ).pipe(
        S.rest(S.uniqueSymbol(Symbol.for("@effect/schema/test/b"), {
          [AST.IdentifierAnnotationId]: "b"
        })),
        S.element(S.uniqueSymbol(Symbol.for("@effect/schema/test/c"), {
          [AST.IdentifierAnnotationId]: "c"
        }))
      )
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([
        `a = Symbol.for("@effect/schema/test/a")`,
        `b = Symbol.for("@effect/schema/test/b")`,
        `c = Symbol.for("@effect/schema/test/c")`,
        `readonly [
    typeof a,
    ...(typeof b)[],
    typeof c
]`
      ])
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.number)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly [
    number,
    ...number[]
]`])
    })

    it("ReadonlyArray<unknown>", () => {
      const schema = S.array(S.unknown)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly unknown[]`])
    })

    it("ReadonlyArray<any>", () => {
      const schema = S.array(S.any)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`readonly any[]`])
    })
  })

  describe.concurrent("struct", () => {
    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly a: number;
}`])
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly a: number | undefined;
}`])
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly a?: number;
}`])
    })

    it("optional property signature with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly a?: number | undefined;
}`])
    })

    it("record(string, unknown)", () => {
      const schema = S.record(S.string, S.unknown)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly [x: string]: unknown;
}`])
    })

    it("record(string, any)", () => {
      const schema = S.record(S.string, S.any)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly [x: string]: any;
}`])
    })

    it("record(string, string)", () => {
      const schema = S.record(S.string, S.string)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly [x: string]: string;
}`])
    })

    it("record(symbol, string)", () => {
      const schema = S.record(S.symbol, S.string)
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    readonly [x: symbol]: string;
}`])
    })

    it("all with symbols", () => {
      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.struct({
        [a]: S.uniqueSymbol(b, {
          [AST.IdentifierAnnotationId]: "b"
        }),
        c: S.number
      }).pipe(
        S.extend(
          S.record(
            S.string,
            S.uniqueSymbol(Symbol.for("@effect/schema/test/d"), {
              [AST.IdentifierAnnotationId]: "d"
            })
          )
        )
      )
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([
        `b = Symbol.for("@effect/schema/test/b")`,
        `d = Symbol.for("@effect/schema/test/d")`,
        `{
    readonly [Symbol.for("@effect/schema/test/a")]: typeof b;
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
      S.uniqueSymbol(Symbol.for("@effect/schema/test/a"), {
        [AST.IdentifierAnnotationId]: "a"
      })
    )
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([
      `a = Symbol.for("@effect/schema/test/a")`,
      `string | number | typeof a`
    ])
  })

  it("optionFromOption", () => {
    const schema = S.optionFromSelf(S.struct({ a: S.string }))
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([`Option<{
    readonly a: string;
}>`])
  })

  it("example: compile to TypeScript AST", () => {
    const schema = S.struct({
      name: S.string,
      age: S.number
    })
    // const typeNode: ts.TypeNode
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([`{
    readonly name: string;
    readonly age: number;
}`])
  })

  it("int", () => {
    const schema = S.number.pipe(S.int())
    const ts = typeScriptFor(schema)
    expect(printNodes(ts.nodes)).toEqual([`number`])
  })

  describe.concurrent("jsDoc", () => {
    it("property signatures", () => {
      const schema = S.make(AST.createTypeLiteral(
        [
          AST.createPropertySignature("a", AST.stringKeyword, false, true, {
            [AST.DocumentationAnnotationId]: "description"
          })
        ],
        []
      ))
      const ts = typeScriptFor(schema)
      expect(printNodes(ts.nodes)).toEqual([`{
    /** description */
    readonly a: string;
}`])
    })
  })
})
