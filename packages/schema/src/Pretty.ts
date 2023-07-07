/**
 * @since 1.0.0
 */
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import * as AST from "@effect/schema/AST"
import * as I from "@effect/schema/internal/common"
import * as P from "@effect/schema/Parser"
import type { Schema } from "@effect/schema/Schema"
import * as S from "@effect/schema/Schema"
import { formatActual } from "@effect/schema/TreeFormatter"

/**
 * @category model
 * @since 1.0.0
 */
export interface Pretty<To> {
  (a: To): string
}

/**
 * @category hooks
 * @since 1.0.0
 */
export const PrettyHookId = I.PrettyHookId

/**
 * @category prettify
 * @since 1.0.0
 */
export const to = <I, A>(schema: Schema<I, A>): (a: A) => string => compile(schema.ast)

/**
 * @category prettify
 * @since 1.0.0
 */
export const from = <I, A>(schema: Schema<I, A>): (i: I) => string => compile(AST.from(schema.ast))

const getHook = AST.getAnnotation<(...args: ReadonlyArray<Pretty<any>>) => Pretty<any>>(
  PrettyHookId
)

const toString = () => String

const stringify = () => (a: any) => JSON.stringify(a)

const format = () => formatActual

/**
 * @since 1.0.0
 */
export const match: AST.Match<Pretty<any>> = {
  "Declaration": (ast, go) =>
    pipe(
      getHook(ast),
      O.match({
        onNone: () => go(ast.type),
        onSome: (handler) => handler(...ast.typeParameters.map(go))
      })
    ),
  "VoidKeyword": () => () => "void(0)",
  "NeverKeyword": () =>
    () => {
      throw new Error("cannot pretty print a `never` value")
    },
  "Literal": () =>
    (literal: AST.LiteralValue): string =>
      typeof literal === "bigint" ?
        `${String(literal)}n` :
        JSON.stringify(literal),
  "SymbolKeyword": toString,
  "UniqueSymbol": toString,
  "TemplateLiteral": stringify,
  "UndefinedKeyword": toString,
  "UnknownKeyword": format,
  "AnyKeyword": format,
  "ObjectKeyword": format,
  "StringKeyword": stringify,
  "NumberKeyword": toString,
  "BooleanKeyword": toString,
  "BigIntKeyword": () => (a) => `${String(a)}n`,
  "Enums": stringify,
  "Tuple": (ast, go) => {
    const elements = ast.elements.map((e) => go(e.type))
    const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
    return (input: ReadonlyArray<unknown>) => {
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
          output.push(elements[i](input[i]))
        }
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(rest)) {
        const head = RA.headNonEmpty(rest.value)
        const tail = RA.tailNonEmpty(rest.value)
        for (; i < input.length - tail.length; i++) {
          output.push(head(input[i]))
        }
        // ---------------------------------------------
        // handle post rest elements
        // ---------------------------------------------
        for (let j = 0; j < tail.length; j++) {
          i += j
          output.push(tail[j](input[i]))
        }
      }

      return "[" + output.join(", ") + "]"
    }
  },
  "TypeLiteral": (ast, go) => {
    const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
    const indexSignatureTypes = ast.indexSignatures.map((is) => go(is.type))
    const expectedKeys: any = {}
    for (let i = 0; i < propertySignaturesTypes.length; i++) {
      expectedKeys[ast.propertySignatures[i].name] = null
    }
    return (input: { readonly [x: PropertyKey]: unknown }) => {
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
        output.push(
          `${getPrettyPropertyKey(name)}: ${propertySignaturesTypes[i](input[name])}`
        )
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
            output.push(`${getPrettyPropertyKey(key)}: ${type(input[key])}`)
          }
        }
      }

      return RA.isNonEmptyReadonlyArray(output) ? "{ " + output.join(", ") + " }" : "{}"
    }
  },
  "Union": (ast, go) => {
    const types = ast.types.map((ast) => [P.is(S.make(ast)), go(ast)] as const)
    return (a) => {
      const index = types.findIndex(([is]) => is(a))
      return types[index][1](a)
    }
  },
  "Lazy": (ast, go) => {
    const get = I.memoizeThunk(() => go(ast.f()))
    return (a) => get()(a)
  },
  "Refinement": (ast, go) => go(ast.from),
  "Transform": (ast, go) => go(ast.to)
}

const compile = AST.getCompiler(match)

const getPrettyPropertyKey = (name: PropertyKey): string =>
  typeof name === "string" ? JSON.stringify(name) : String(name)
