import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type * as AST from "@fp-ts/schema/AST"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import ts from "typescript"

const printNode = (node: ts.Node, printerOptions?: ts.PrinterOptions) => {
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

const TypeScriptId: unique symbol = Symbol.for(
  "@fp-ts/schema/test/compiler/TypeScript"
)

interface TypeScript<A> extends S.Schema<A> {
  readonly typeNode: ts.TypeNode
}

const make = (ast: AST.AST, typeNode: ts.TypeNode): TypeScript<any> => ({ ast, typeNode }) as any

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
            P.findHandler(TypeScriptId, ast.id),
            O.match(
              () =>
                pipe(
                  ast.typeParameters.map(go),
                  RA.match(
                    () => {
                      throw new Error("Unhandled schema")
                    },
                    (_typeParameters) => {
                      throw new Error("Unhandled schema")
                    }
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
              ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(literal))
            )
          } else if (typeof literal === "number") {
            return make(
              ast,
              ts.factory.createLiteralTypeNode(ts.factory.createNumericLiteral(literal))
            )
          } else if (typeof literal === "boolean") {
            return literal === true ?
              make(ast, ts.factory.createLiteralTypeNode(ts.factory.createTrue())) :
              make(ast, ts.factory.createLiteralTypeNode(ts.factory.createFalse()))
          } else if (typeof literal === "bigint") {
            return make(
              ast,
              ts.factory.createLiteralTypeNode(ts.factory.createBigIntLiteral(literal.toString()))
            )
          } else {
            return make(ast, ts.factory.createLiteralTypeNode(ts.factory.createNull()))
          }
        }
        case "UniqueSymbol": {
          const node = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("Symbol"), "for"),
            [],
            [ts.factory.createStringLiteral(ast.symbol.description!)]
          )
          return make(
            ast,
            ts.factory.createTypeQueryNode(ts.factory.createIdentifier(printNode(node)))
          )
        }
        case "UndefinedKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword))
        case "VoidKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword))
        case "NeverKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword))
        case "UnknownKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword))
        case "AnyKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))
        case "StringKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword))
        case "NumberKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))
        case "BooleanKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword))
        case "BigIntKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword))
        case "SymbolKeyword":
          return make(ast, ts.factory.createKeywordTypeNode(ts.SyntaxKind.SymbolKeyword))
        case "Tuple": {
          const elements: Array<ts.TypeNode> = ast.elements.map((e) => {
            const element = go(e.type).typeNode
            return e.isOptional ? ts.factory.createOptionalTypeNode(element) : element
          })
          const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
          if (O.isSome(rest)) {
            const head = RA.headNonEmpty(rest.value)
            const tail = RA.tailNonEmpty(rest.value)
            if (elements.length === 0 && tail.length === 0) {
              const array = ts.factory.createArrayTypeNode(head.typeNode)
              return make(
                ast,
                ast.isReadonly ?
                  ts.factory.createTypeOperatorNode(ts.SyntaxKind.ReadonlyKeyword, array) :
                  array
              )
            }
            elements.push(
              ts.factory.createRestTypeNode(ts.factory.createArrayTypeNode(head.typeNode))
            )
            elements.push(...tail.map((element) => element.typeNode))
          }
          const tuple = ts.factory.createTupleTypeNode(elements)
          return make(
            ast,
            ast.isReadonly ?
              ts.factory.createTypeOperatorNode(ts.SyntaxKind.ReadonlyKeyword, tuple) :
              tuple
          )
        }
        case "Union":
          return make(
            ast,
            ts.factory.createUnionTypeNode(ast.members.map((member) => go(member).typeNode))
          )
        case "Enums": {
          const node = ts.factory.createEnumDeclaration(
            undefined,
            "name",
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
            ts.factory.createTypeQueryNode(ts.factory.createIdentifier(printNode(node)))
          )
        }
        case "Struct": {
          const members: Array<ts.PropertySignature | ts.IndexSignatureDeclaration> = ast.fields
            .map((field) =>
              ts.factory.createPropertySignature(
                field.isReadonly ?
                  [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] :
                  undefined,
                String(field.key),
                field.isOptional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
                go(field.value).typeNode
              )
            )
          members.push(...ast.indexSignatures.map((is) =>
            ts.factory.createIndexSignature(
              is.isReadonly ?
                [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] :
                undefined,
              [ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                "_",
                undefined,
                is.key === "string" ?
                  ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword) :
                  ts.factory.createKeywordTypeNode(ts.SyntaxKind.SymbolKeyword)
              )],
              go(is.value).typeNode
            )
          ))
          return make(
            ast,
            ts.factory.createTypeLiteralNode(members)
          )
        }
        case "Lazy":
          throw new Error("Unhandled schema: TODO")
      }
    }

    return go(schema.ast)
  }

const typeScriptFor = provideTypeScriptFor(P.empty)

describe.concurrent("TypeScript", () => {
  it("never", () => {
    const schema = S.never
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("never")
  })

  it("undefined", () => {
    const schema = S.undefined
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("undefined")
  })

  it("void", () => {
    const schema = S.void
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("void")
  })

  it("string", () => {
    const schema = S.string
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("string")
  })

  it("number", () => {
    const schema = S.number
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("number")
  })

  it("boolean", () => {
    const schema = S.boolean
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("boolean")
  })

  it("bigint", () => {
    const schema = S.bigint
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("bigint")
  })

  it("symbol", () => {
    const schema = S.symbol
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("symbol")
  })

  it("undefined", () => {
    const schema = S.undefined
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("undefined")
  })

  describe.concurrent("literal", () => {
    it("string", () => {
      const schema = S.literal("a")
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`"a"`)
    })

    it("number", () => {
      const schema = S.literal(1)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual("1")
    })

    it("true", () => {
      const schema = S.literal(true)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`true`)
    })

    it("false", () => {
      const schema = S.literal(false)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`false`)
    })

    it("null", () => {
      const schema = S.literal(null)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`null`)
    })
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.uniqueSymbol(a)
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual(`typeof Symbol.for("@fp-ts/schema/test/a")`)
  })

  it("enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual(`typeof enum name {
    Apple = 0,
    Banana = 1
}`)
  })

  describe.concurrent("tuple", () => {
    it("required element", () => {
      const schema = S.tuple(S.number)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    number
]`)
    })

    it("required element with undefined", () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    number | undefined
]`)
    })

    it("optional element", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.number))
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    number?
]`)
    })

    it("optional element with undefined", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    (number | undefined)?
]`)
    })

    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    string,
    number
]`)
    })

    it("empty tuple", () => {
      const schema = S.tuple()
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
]`)
    })

    it("optional elements", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    string?,
    number?
]`)
    })

    it("array", () => {
      const schema = S.array(S.string)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly string[]`)
    })

    it("post rest element", () => {
      const schema = pipe(S.array(S.number), S.element(S.boolean))
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    ...number[],
    boolean
]`)
    })

    it("post rest elements", () => {
      const schema = pipe(
        S.array(S.number),
        S.element(S.boolean),
        S.element(S.union(S.string, S.undefined))
      )
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    ...number[],
    boolean,
    string | undefined
]`)
    })

    it("post rest elements when rest is unknown", () => {
      const schema = pipe(S.array(S.unknown), S.element(S.boolean))
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    ...unknown[],
    boolean
]`)
    })

    it("all", () => {
      const schema = pipe(
        S.tuple(S.string),
        S.rest(S.number),
        S.element(S.boolean)
      )
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    string,
    ...number[],
    boolean
]`)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.number)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly [
    number,
    ...number[]
]`)
    })

    it("ReadonlyArray<unknown>", () => {
      const schema = S.array(S.unknown)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly unknown[]`)
    })

    it("ReadonlyArray<any>", () => {
      const schema = S.array(S.any)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`readonly any[]`)
    })
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const schema = S.struct({ a: S.number })
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly a: number;
}`)
    })

    it("required field with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly a: number | undefined;
}`)
    })

    it("optional field", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly a?: number;
}`)
    })

    it("optional field with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly a?: number | undefined;
}`)
    })

    it("{ readonly [_: string]: unknown }", () => {
      const schema = S.stringIndexSignature(S.unknown)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly [_: string]: unknown;
}`)
    })

    it("{ readonly [_: string]: any }", () => {
      const schema = S.stringIndexSignature(S.any)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly [_: string]: any;
}`)
    })

    it("stringIndexSignature", () => {
      const schema = S.stringIndexSignature(S.string)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly [_: string]: string;
}`)
    })

    it("symbolIndexSignature", () => {
      const schema = S.symbolIndexSignature(S.string)
      const node = typeScriptFor(schema)
      expect(printNode(node.typeNode)).toEqual(`{
    readonly [_: symbol]: string;
}`)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const node = typeScriptFor(schema)
    expect(printNode(node.typeNode)).toEqual("string | number")
  })

  it("example: compile to TypeScript AST", () => {
    const schema = S.struct({
      name: S.string,
      age: S.number
    })
    // const typeNode: ts.TypeNode
    const { typeNode } = typeScriptFor(schema)
    expect(printNode(typeNode)).toEqual(`{
    readonly name: string;
    readonly age: number;
}`)
  })
})
