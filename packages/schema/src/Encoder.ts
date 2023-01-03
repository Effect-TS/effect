/**
 * @since 1.0.0
 */

import { absurd, identity, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import type * as AST from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export interface Encoder<S, A> extends Schema<A> {
  readonly encode: (value: A) => S
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, encode: Encoder<S, A>["encode"]) => Encoder<S, A> =
  I.makeEncoder

const getTypeAliasHook = H.getTypeAliasHook<H.TypeAliasHook<Encoder<unknown, any>>>(
  H.EncoderTypeAliasHookId
)

/**
 * @since 1.0.0
 */
export const encoderFor = <A>(schema: Schema<A>): Encoder<unknown, A> => {
  const go = (ast: AST.AST): Encoder<unknown, any> => {
    switch (ast._tag) {
      case "TypeAlias":
        return pipe(
          getTypeAliasHook(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "Literal":
      case "UniqueSymbol":
      case "Enums":
      case "UndefinedKeyword":
      case "VoidKeyword":
      case "UnknownKeyword":
      case "AnyKeyword":
      case "StringKeyword":
      case "NumberKeyword":
      case "BooleanKeyword":
      case "SymbolKeyword":
      case "ObjectKeyword":
      case "TemplateLiteral":
        return make(I.makeSchema(ast), identity)
      case "NeverKeyword":
        return make<unknown, never>(I.makeSchema(ast), absurd) as any
      case "BigIntKeyword":
        return make(I.makeSchema(ast), (n) => n.toString())
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        return make(
          I.makeSchema(ast),
          (input: ReadonlyArray<unknown>) => {
            const output: Array<any> = []
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
                output.push(elements[i].encode(input[i]))
              }
            }
            // ---------------------------------------------
            // handle rest element
            // ---------------------------------------------
            if (O.isSome(rest)) {
              const head = RA.headNonEmpty(rest.value)
              const tail = RA.tailNonEmpty(rest.value)
              for (; i < input.length - tail.length; i++) {
                output.push(head.encode(input[i]))
              }
              // ---------------------------------------------
              // handle post rest elements
              // ---------------------------------------------
              for (let j = 0; j < tail.length; j++) {
                i += j
                output.push(tail[j].encode(input[i]))
              }
            }

            return output
          }
        )
      }
      case "TypeLiteral": {
        const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
        const indexSignatureTypes = ast.indexSignatures.map((is) => go(is.type))
        return make(
          I.makeSchema(ast),
          (input: { readonly [x: PropertyKey]: unknown }) => {
            const output: any = {}
            const expectedKeys: any = {}
            // ---------------------------------------------
            // handle property signatures
            // ---------------------------------------------
            for (let i = 0; i < propertySignaturesTypes.length; i++) {
              const ps = ast.propertySignatures[i]
              const encoder = propertySignaturesTypes[i]
              const name = ps.name
              expectedKeys[name] = null
              if (!Object.prototype.hasOwnProperty.call(input, name) && ps.isOptional) {
                continue
              }
              output[name] = encoder.encode(input[name])
            }
            // ---------------------------------------------
            // handle index signatures
            // ---------------------------------------------
            if (indexSignatureTypes.length > 0) {
              for (let i = 0; i < indexSignatureTypes.length; i++) {
                const type = indexSignatureTypes[i]
                const parameterAST = ast.indexSignatures[i].parameter
                const keys = I.getKeysForIndexSignature(input, parameterAST)
                for (const key of keys) {
                  if (!(key in expectedKeys)) {
                    output[key] = type.encode(input[key])
                  }
                }
              }
            }

            return output
          }
        )
      }
      case "Union": {
        const types = ast.types.map((m) => [G.guardFor(I.makeSchema(m)), go(m)] as const)
        return make(I.makeSchema(ast), (input) => {
          // ---------------------------------------------
          // compute encoder candidates
          // ---------------------------------------------
          const encoders: Array<Encoder<unknown, any>> = []
          for (let i = 0; i < types.length; i++) {
            if (types[i][0].is(input)) {
              encoders.push(types[i][1])
            } else if (encoders.length > 0) {
              break
            }
          }

          let output = encoders[0].encode(input)

          // ---------------------------------------------
          // compute best output
          // ---------------------------------------------
          let weight: number | null = null
          for (let i = 1; i < encoders.length; i++) {
            const o = encoders[i].encode(input)
            const w = getWeight(o)
            if (weight === null) {
              weight = getWeight(output)
            }
            if (w > weight) {
              output = o
              weight = w
            }
          }

          return output
        })
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<void, Encoder<unknown, any>>(f)
        const schema = I.lazy(f)
        return make(schema, (a) => get().encode(a))
      }
      case "Refinement":
        return go(ast.from)
      case "Transform": {
        const to = go(ast.to)
        const from = go(ast.from)
        // TODO: remove getOrThrow once encoders are allowed to possibly fail
        return make(
          I.makeSchema(ast),
          (a) =>
            pipe(
              to.encode(a),
              ast.g,
              T.getOrThrow(() => new Error(`cannot encode ${a}`)),
              from.encode
            )
        )
      }
    }
  }

  return go(schema.ast)
}

const getWeight = (u: unknown): number => {
  if (Array.isArray(u)) {
    return u.length
  } else if (typeof u === "object" && u !== null) {
    return I.ownKeys(u).length
  }
  return 0
}
