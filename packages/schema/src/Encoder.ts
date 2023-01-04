/**
 * @since 1.0.0
 */

import { absurd, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { Both } from "@fp-ts/data/These"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import type * as AST from "@fp-ts/schema/AST"
import * as DE from "@fp-ts/schema/DecodeError"
import type { DecodeResult } from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export interface Encoder<O, A> extends Schema<A> {
  readonly encode: (value: A) => DecodeResult<O>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <O, A>(schema: Schema<A>, encode: Encoder<O, A>["encode"]) => Encoder<O, A> =
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
      case "BigIntKeyword":
        return make(I.makeSchema(ast), I.success)
      case "NeverKeyword":
        return make<unknown, never>(I.makeSchema(ast), absurd) as any
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        return make(
          I.makeSchema(ast),
          (input: ReadonlyArray<unknown>) => {
            const output: Array<any> = []
            const es: Array<DE.DecodeError> = []
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
                const encoder = elements[i]
                const t = encoder.encode(input[i])
                if (I.isFailure(t)) {
                  // the input element is present but is not valid, bail out
                  return I.failures(I.mutableAppend(es, DE.index(i, t.left)))
                } else if (I.isWarning(t)) {
                  es.push(DE.index(i, t.left))
                }
                output.push(t.right)
              }
            }
            // ---------------------------------------------
            // handle rest element
            // ---------------------------------------------
            if (O.isSome(rest)) {
              const head = RA.headNonEmpty(rest.value)
              const tail = RA.tailNonEmpty(rest.value)
              for (; i < input.length - tail.length; i++) {
                const t = head.encode(input[i])
                if (I.isFailure(t)) {
                  return I.failures(I.mutableAppend(es, DE.index(i, t.left)))
                } else {
                  if (I.isWarning(t)) {
                    es.push(DE.index(i, t.left))
                  }
                  output.push(t.right)
                }
              }
              // ---------------------------------------------
              // handle post rest elements
              // ---------------------------------------------
              for (let j = 0; j < tail.length; j++) {
                i += j
                if (input.length < i + 1) {
                  // the input element is missing and the element is required, bail out
                  return I.failure(DE.index(i, [DE.missing]))
                } else {
                  const t = tail[j].encode(input[i])
                  if (I.isFailure(t)) {
                    // the input element is present but is not valid, bail out
                    return I.failures(I.mutableAppend(es, DE.index(i, t.left)))
                  } else if (I.isWarning(t)) {
                    es.push(DE.index(i, t.left))
                  }
                  output.push(t.right)
                }
              }
            } else {
              // ---------------------------------------------
              // handle unexpected indexes
              // ---------------------------------------------
              for (; i < input.length; i++) {
                es.push(DE.index(i, [DE.unexpected(input[i])]))
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmpty(es) ? I.warnings(es, output) : I.success(output)
          }
        )
      }
      case "TypeLiteral": {
        const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
        const indexSignatures = ast.indexSignatures.map((is) =>
          [go(is.parameter), go(is.type)] as const
        )
        return make(
          I.makeSchema(ast),
          (input: { readonly [x: PropertyKey]: unknown }) => {
            const output: any = {}
            const expectedKeys: any = {}
            const es: Array<DE.DecodeError> = []
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
              const t = encoder.encode(input[name])
              if (I.isFailure(t)) {
                // the input key is present but is not valid, bail out
                return I.failures(I.mutableAppend(es, DE.key(name, t.left)))
              } else if (I.isWarning(t)) {
                es.push(DE.key(name, t.left))
              }
              output[name] = t.right
            }
            // ---------------------------------------------
            // handle index signatures
            // ---------------------------------------------
            if (indexSignatures.length > 0) {
              for (let i = 0; i < indexSignatures.length; i++) {
                const parameter = indexSignatures[i][0]
                const type = indexSignatures[i][1]
                const keys = I.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
                for (const key of keys) {
                  // ---------------------------------------------
                  // handle keys
                  // ---------------------------------------------
                  let t = parameter.encode(key)
                  if (I.isFailure(t)) {
                    return I.failures(I.mutableAppend(es, DE.key(key, t.left)))
                  } else if (I.isWarning(t)) {
                    es.push(DE.key(key, t.left))
                  }
                  // ---------------------------------------------
                  // handle values
                  // ---------------------------------------------
                  t = type.encode(input[key])
                  if (I.isFailure(t)) {
                    return I.failures(I.mutableAppend(es, DE.key(key, t.left)))
                  } else {
                    if (I.isWarning(t)) {
                      es.push(DE.key(key, t.left))
                    }
                    output[key] = t.right
                  }
                }
              }
            } else {
              // ---------------------------------------------
              // handle unexpected keys
              // ---------------------------------------------
              for (const key of I.ownKeys(input)) {
                if (!(Object.prototype.hasOwnProperty.call(expectedKeys, key))) {
                  es.push(DE.key(key, [DE.unexpected(input[key])]))
                }
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmpty(es) ? I.warnings(es, output) : I.success(output)
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

          const es: Array<DE.DecodeError> = []
          let output: Both<RA.NonEmptyReadonlyArray<DE.DecodeError>, any> | null = null

          // ---------------------------------------------
          // compute best output
          // ---------------------------------------------
          for (let i = 0; i < encoders.length; i++) {
            const t = encoders[i].encode(input)
            if (I.isSuccess(t)) {
              // if there are no warnings this is the best output
              return t
            } else if (I.isWarning(t)) {
              // choose the output with less warnings related to unexpected keys / indexes
              if (
                !output ||
                output.left.filter(I.hasUnexpectedError).length >
                  t.left.filter(I.hasUnexpectedError).length
              ) {
                output = t
              }
            } else {
              es.push(DE.member(t.left))
            }
          }

          // ---------------------------------------------
          // compute output
          // ---------------------------------------------
          return output ?
            output :
            I.isNonEmpty(es) ?
            I.failures(es) :
            I.failure(DE.type("never", input))
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
        const from = go(ast.from)
        return make(I.makeSchema(ast), (a) => pipe(ast.g(a), I.flatMap(from.encode)))
      }
    }
  }

  return go(schema.ast)
}
