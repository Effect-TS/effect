/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as H from "@fp-ts/schema/annotation/HookAnnotation"
import type * as AST from "@fp-ts/schema/AST"
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

/**
 * @category prettify
 * @since 1.0.0
 */
export const pretty = <A>(schema: Schema<A>) => (a: A): string => prettyFor(schema).pretty(a)

const getHook = H.getHook<H.Hook<Pretty<any>>>(
  H.PrettyHookId
)

const prettyFor = <A>(schema: Schema<A>): Pretty<A> => {
  const go = (ast: AST.AST): Pretty<any> => {
    switch (ast._tag) {
      case "TypeAlias":
        return pipe(
          getHook(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "Literal":
        return make(
          I.makeSchema(ast),
          (literal: AST.LiteralValue): string =>
            typeof literal === "bigint" ?
              `${literal.toString()}n` :
              typeof literal === "symbol" ?
              String(literal) :
              JSON.stringify(literal)
        )
      case "SymbolKeyword":
      case "BooleanKeyword":
      case "UniqueSymbol":
      case "TemplateLiteral":
        return make(I.makeSchema(ast), (s) => String(s))
      case "UndefinedKeyword":
        return make(I.makeSchema(ast), () => "undefined")
      case "VoidKeyword":
        return make(I.makeSchema(ast), () => "void(0)")
      case "NeverKeyword":
        return make(I.makeSchema(ast), () => {
          throw new Error("cannot pretty print a `never` value")
        }) as any
      case "UnknownKeyword":
      case "AnyKeyword":
      case "ObjectKeyword":
        return make(I.makeSchema(ast), (a) => JSON.stringify(a, null, 2))
      case "StringKeyword":
        return make(I.makeSchema(ast), (s) => JSON.stringify(s))
      case "NumberKeyword":
        return make(
          I.number,
          (n) => Number.isNaN(n) ? "NaN" : String(n)
        )
      case "BigIntKeyword":
        return make(I.makeSchema(ast), (bi) => `${bi.toString()}n`)
      case "Tuple": {
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
      }
      case "TypeLiteral": {
        const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
        const indexSignatureTypes = ast.indexSignatures.map((is) => go(is.type))
        return make(
          I.makeSchema(ast),
          (input: { readonly [x: PropertyKey]: unknown }) => {
            const output: Array<string> = []
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
            }
            // ---------------------------------------------
            // handle index signatures
            // ---------------------------------------------
            if (indexSignatureTypes.length > 0) {
              for (let i = 0; i < indexSignatureTypes.length; i++) {
                const type = indexSignatureTypes[i]
                const keys = I.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
                for (const key of keys) {
                  output.push(`${prettyName(key)}: ${type.pretty(input[key])}`)
                }
              }
            }

            return isNonEmpty(output) ? "{ " + output.join(", ") + " }" : "{}"
          }
        )
      }
      case "Union": {
        const types = ast.types.map((m) => [P.is(I.makeSchema(m)), go(m)] as const)
        return make(I.makeSchema(ast), (a) => {
          const index = types.findIndex(([is]) => is(a))
          return types[index][1].pretty(a)
        })
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<void, Pretty<A>>(f)
        const schema = I.lazy(ast.identifier, f)
        return make(schema, (a) => get().pretty(a))
      }
      case "Enums":
        return make(I.makeSchema(ast), (sn) => JSON.stringify(sn))
      case "Refinement":
        return go(ast.from)
      case "Transform":
        return go(ast.to)
    }
  }

  return go(schema.ast)
}

const prettyName = (name: PropertyKey): string =>
  typeof name === "string" ? JSON.stringify(name) : String(name)
