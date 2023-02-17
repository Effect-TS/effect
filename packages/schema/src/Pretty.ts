/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/core/Function"
import * as O from "@fp-ts/core/Option"
import { isNonEmpty } from "@fp-ts/core/ReadonlyArray"
import * as RA from "@fp-ts/core/ReadonlyArray"
import * as H from "@fp-ts/schema/annotation/Hook"
import * as AST from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Parser"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export interface Pretty<A> extends Schema<A> {
  readonly pretty: (a: A) => string
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, pretty: Pretty<A>["pretty"]) => Pretty<A> = I.makePretty

const getHook = AST.getAnnotation<H.Hook<Pretty<any>>>(
  H.PrettyHookId
)

/**
 * @since 1.0.0
 */
export const match: AST.Match<Pretty<any>> = {
  "TypeAlias": (ast, go) =>
    pipe(
      getHook(ast),
      O.match(
        () => go(ast.type),
        ({ handler }) => handler(...ast.typeParameters.map(go))
      )
    ),
  "Literal": (ast) =>
    make(
      I.makeSchema(ast),
      (literal: AST.LiteralValue): string =>
        typeof literal === "bigint" ?
          `${literal.toString()}n` :
          JSON.stringify(literal)
    ),
  "SymbolKeyword": (ast) => make(I.makeSchema(ast), (s) => String(s)),
  "BooleanKeyword": (ast) => make(I.makeSchema(ast), (s) => String(s)),
  "UniqueSymbol": (ast) => make(I.makeSchema(ast), (s) => String(s)),
  "TemplateLiteral": (ast) => make(I.makeSchema(ast), (s) => String(s)),
  "UndefinedKeyword": (ast) => make(I.makeSchema(ast), () => "undefined"),
  "VoidKeyword": (ast) => make(I.makeSchema(ast), () => "void(0)"),
  "NeverKeyword": (ast) =>
    make(I.makeSchema(ast), () => {
      throw new Error("cannot pretty print a `never` value")
    }) as any,
  "UnknownKeyword": (ast) => make(I.makeSchema(ast), (a) => JSON.stringify(a, null, 2)),
  "AnyKeyword": (ast) => make(I.makeSchema(ast), (a) => JSON.stringify(a, null, 2)),
  "ObjectKeyword": (ast) => make(I.makeSchema(ast), (a) => JSON.stringify(a, null, 2)),
  "StringKeyword": (ast) => make(I.makeSchema(ast), (s) => JSON.stringify(s)),
  "NumberKeyword": (ast) =>
    make(
      I.makeSchema(ast),
      (n) => Number.isNaN(n) ? "NaN" : String(n)
    ),
  "BigIntKeyword": (ast) => make(I.makeSchema(ast), (bi) => `${bi.toString()}n`),
  "Tuple": (ast, go) => {
    const elements = ast.elements.map((e) => go(e.type))
    const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
    return make(
      I.makeSchema(ast),
      (input: ReadonlyArray<unknown>) => {
        const output: Array<string> = []
        let i = 0
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        for (; i < elements.length; i++) {
          if (input.length < i + 1) {
            if (ast.elements[i].isOptional) {
              continue
            }
          } else {
            output.push(elements[i].pretty(input[i]))
          }
        }
        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (O.isSome(rest)) {
          const head = RA.headNonEmpty(rest.value)
          const tail = RA.tailNonEmpty(rest.value)
          for (; i < input.length - tail.length; i++) {
            output.push(head.pretty(input[i]))
          }
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          for (let j = 0; j < tail.length; j++) {
            i += j
            output.push(tail[j].pretty(input[i]))
          }
        }

        return "[" + output.join(", ") + "]"
      }
    )
  },
  "TypeLiteral": (ast, go) => {
    const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
    const indexSignatureTypes = ast.indexSignatures.map((is) => go(is.type))
    return make(
      I.makeSchema(ast),
      (input: { readonly [x: PropertyKey]: unknown }) => {
        const output: Array<string> = []
        const expectedKeys: any = {}
        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        for (let i = 0; i < propertySignaturesTypes.length; i++) {
          const ps = ast.propertySignatures[i]
          const name = ps.name
          if (ps.isOptional && !Object.prototype.hasOwnProperty.call(input, name)) {
            continue
          }
          output.push(`${prettyName(name)}: ${propertySignaturesTypes[i].pretty(input[name])}`)
          expectedKeys[name] = null
        }
        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        if (indexSignatureTypes.length > 0) {
          for (let i = 0; i < indexSignatureTypes.length; i++) {
            const type = indexSignatureTypes[i]
            const keys = I.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
            for (const key of keys) {
              if (Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                continue
              }
              output.push(`${prettyName(key)}: ${type.pretty(input[key])}`)
            }
          }
        }

        return isNonEmpty(output) ? "{ " + output.join(", ") + " }" : "{}"
      }
    )
  },
  "Union": (ast, go) => {
    const types = ast.types.map((m) => [P.is(I.makeSchema(m)), go(m)] as const)
    return make(I.makeSchema(ast), (a) => {
      const index = types.findIndex(([is]) => is(a))
      return types[index][1].pretty(a)
    })
  },
  "Lazy": (ast, go) => {
    const f = () => go(ast.f())
    const get = I.memoize<void, Pretty<any>>(f)
    const schema = I.lazy(f)
    return make(schema, (a) => get().pretty(a))
  },
  "Enums": (ast) => make(I.makeSchema(ast), (sn) => JSON.stringify(sn)),
  "Refinement": (ast, go) => go(ast.from),
  "Transform": (ast, go) => go(ast.to)
}

const compile = AST.getCompiler(match)

/**
 * @category prettify
 * @since 1.0.0
 */
export const pretty = <A>(schema: Schema<A>) => (a: A): string => compile(schema.ast).pretty(a)

const prettyName = (name: PropertyKey): string =>
  typeof name === "string" ? JSON.stringify(name) : String(name)
