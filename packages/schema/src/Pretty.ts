/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { PrettyAnnotation } from "@fp-ts/schema/annotation/PrettyAnnotation"
import { isPrettyAnnotation } from "@fp-ts/schema/annotation/PrettyAnnotation"
import type * as AST from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Pretty<A> extends Schema<A> {
  readonly pretty: (a: A) => string
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, pretty: Pretty<A>["pretty"]) => Pretty<A> = I.makePretty

const getPrettyAnnotation = (ast: AST.AST): O.Option<PrettyAnnotation> =>
  pipe(
    ast.annotations,
    RA.findFirst(isPrettyAnnotation)
  )

/**
 * @since 1.0.0
 */
export const prettyFor = <A>(schema: Schema<A>): Pretty<A> => {
  const go = (ast: AST.AST): Pretty<any> => {
    switch (ast._tag) {
      case "TypeAliasDeclaration":
        return pipe(
          getPrettyAnnotation(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "LiteralType":
        return make(I.makeSchema(ast), _literalType)
      case "UniqueSymbol":
        return make(I.makeSchema(ast), (s) => String(s))
      case "UndefinedKeyword":
        return make(I._undefined, () => "undefined")
      case "VoidKeyword":
        return make(I._void, () => "void(0)")
      case "NeverKeyword":
        return make(I.never, () => {
          throw new Error("cannot pretty print a `never` value")
        }) as any
      case "UnknownKeyword":
        return make(I.unknown, (u) => JSON.stringify(u, null, 2))
      case "AnyKeyword":
        return make(I.any, (a) => JSON.stringify(a, null, 2))
      case "StringKeyword":
        return make(I.string, (s) => JSON.stringify(s))
      case "NumberKeyword":
        return make(I.number, (n) => JSON.stringify(n))
      case "BooleanKeyword":
        return make(I.boolean, (b) => JSON.stringify(b))
      case "BigIntKeyword":
        return make(I.boolean, (bi) => `${bi.toString()}n`)
      case "SymbolKeyword":
        return make(I.symbol, (s) => String(s))
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
      case "Struct":
        return _struct(
          ast,
          ast.fields.map((f) => go(f.value)),
          ast.indexSignatures.map((is) => go(is.value))
        )
      case "Union":
        return _union(ast, ast.members.map((m) => [G.guardFor(I.makeSchema(m)), go(m)]))
      case "Lazy":
        return _lazy(() => go(ast.f()))
      case "Enums":
        return make(I.makeSchema(ast), (sn) => JSON.stringify(sn))
      case "Refinement":
        return go(ast.from)
    }
  }

  return go(schema.ast)
}

const _literalType = (literal: AST.Literal): string =>
  typeof literal === "bigint" ?
    `${literal.toString()}n` :
    typeof literal === "symbol" ?
    String(literal) :
    JSON.stringify(literal)

const _propertyKey = (key: PropertyKey): string =>
  typeof key === "string" ? JSON.stringify(key) : String(key)

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Pretty<any>>,
  indexSignatures: ReadonlyArray<Pretty<any>>
): Pretty<any> =>
  make(
    I.makeSchema(ast),
    (input: { readonly [x: string | symbol]: unknown }) => {
      const output: Array<string> = []
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        if (field.isOptional && !Object.prototype.hasOwnProperty.call(input, key)) {
          continue
        }
        output.push(`${_propertyKey(key)}: ${fields[i].pretty(input[key])}`)
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (indexSignatures.length > 0) {
        const keys = Object.keys(input)
        const symbols = Object.getOwnPropertySymbols(input)
        for (let i = 0; i < indexSignatures.length; i++) {
          const pretty = indexSignatures[i]
          const ks = ast.indexSignatures[i].key === "symbol" ? symbols : keys
          for (const key of ks) {
            output.push(`${_propertyKey(key)}: ${pretty.pretty(input[key])}`)
          }
        }
      }

      return isNonEmpty(output) ? "{ " + output.join(", ") + " }" : "{}"
    }
  )

const _union = (
  ast: AST.Union,
  members: ReadonlyArray<readonly [Guard<any>, Pretty<any>]>
): Pretty<any> =>
  make(I.makeSchema(ast), (a) => {
    const index = members.findIndex(([guard]) => guard.is(a))
    return members[index][1].pretty(a)
  })

const _lazy = <A>(
  f: () => Pretty<A>
): Pretty<A> => {
  const get = I.memoize<void, Pretty<A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (a) => get().pretty(a)
  )
}
