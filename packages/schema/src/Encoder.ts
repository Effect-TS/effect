/**
 * @since 1.0.0
 */

import { absurd, identity, pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import { isEncoderAnnotation } from "@fp-ts/schema/annotation/EncoderAnnotation"
import type { EncoderAnnotation } from "@fp-ts/schema/annotation/EncoderAnnotation"
import * as AST from "@fp-ts/schema/AST"
import type { Guard } from "@fp-ts/schema/Guard"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Encoder<S, A> extends Schema<A> {
  readonly encode: (value: A) => S
}

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, encode: Encoder<S, A>["encode"]) => Encoder<S, A> =
  I.makeEncoder

const getEncoderAnnotation = (ast: AST.AST): O.Option<EncoderAnnotation<unknown>> =>
  pipe(
    ast.annotations,
    RA.findFirst(isEncoderAnnotation)
  )

/**
 * @since 1.0.0
 */
export const encoderFor = <A>(schema: Schema<A>): Encoder<unknown, A> => {
  const go = (ast: AST.AST): Encoder<unknown, any> => {
    const annotation = getEncoderAnnotation(ast)
    if (O.isSome(annotation)) {
      const { config, handler } = annotation.value
      if (AST.isTypeAliasDeclaration(ast)) {
        return ast.typeParameters.length > 0 ?
          handler(config, ...ast.typeParameters.map(go)) :
          handler(config, go(ast.type))
      }
      return handler(config, go({ ...ast, annotations: [] }))
    }
    switch (ast._tag) {
      case "TypeAliasDeclaration":
        return go(ast.type)
      case "LiteralType":
      case "UniqueSymbol":
      case "Enums":
        return make(I.makeSchema(ast), identity)
      case "UndefinedKeyword":
        return make(I._undefined, identity)
      case "VoidKeyword":
        return make(I._void, identity)
      case "NeverKeyword":
        return make(I.never, absurd) as any
      case "UnknownKeyword":
        return make(I.unknown, identity)
      case "AnyKeyword":
        return make(I.any, identity)
      case "StringKeyword":
        return make(I.string, identity)
      case "NumberKeyword":
        return make(I.number, identity)
      case "BooleanKeyword":
        return make(I.boolean, identity)
      case "BigIntKeyword":
        return make(I.bigint, (n) => n.toString())
      case "SymbolKeyword":
        return make(I.bigint, identity)
      case "Tuple":
        return _tuple(
          ast,
          ast.elements.map((e) => go(e.type)),
          pipe(ast.rest, O.map(([head]) => go(head))) // TODO: handle tail
        )
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
    }
  }

  return go(schema.ast)
}

const _tuple = (
  ast: AST.Tuple,
  elements: ReadonlyArray<Encoder<any, any>>,
  oRest: Option<Encoder<any, any>>
): Encoder<any, any> =>
  make(
    I.makeSchema(ast),
    (input: ReadonlyArray<unknown>) => {
      const output: Array<any> = []
      let i = 0
      // ---------------------------------------------
      // handle elements
      // ---------------------------------------------
      for (; i < elements.length; i++) {
        // ---------------------------------------------
        // handle optional elements
        // ---------------------------------------------
        if (ast.elements[i].isOptional && input[i] === undefined) {
          if (i < input.length) {
            output[i] = undefined
          }
        } else {
          const encoder = elements[i]
          output[i] = encoder.encode(input[i])
        }
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRest)) {
        const encoder = oRest.value
        for (; i < input.length; i++) {
          output[i] = encoder.encode(input[i])
        }
      }

      return output
    }
  )

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Encoder<any, any>>,
  indexSignatures: ReadonlyArray<Encoder<any, any>>
): Encoder<any, any> =>
  make(
    I.makeSchema(ast),
    (input: { readonly [x: string | symbol]: unknown }) => {
      const output: any = {}
      const processedKeys: any = {}
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        processedKeys[key] = null
        if (!Object.prototype.hasOwnProperty.call(input, key) && field.isOptional) {
          continue
        }
        const encoder = fields[i]
        output[key] = encoder.encode(input[key])
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (indexSignatures.length > 0) {
        const keys = Object.keys(input)
        const symbols = Object.getOwnPropertySymbols(input)
        for (let i = 0; i < indexSignatures.length; i++) {
          const encoder = indexSignatures[i]
          const ks = ast.indexSignatures[i].key === "symbol" ? symbols : keys
          for (const key of ks) {
            if (!(key in processedKeys)) {
              output[key] = encoder.encode(input[key])
            }
          }
        }
      }

      return output
    }
  )

const getWeight = (u: unknown): number => {
  if (Array.isArray(u)) {
    return u.length
  } else if (typeof u === "object" && u !== null) {
    return I.ownKeys(u).length
  }
  return 0
}

const _union = (
  ast: AST.Union,
  members: ReadonlyArray<readonly [Guard<any>, Encoder<any, any>]>
): Encoder<any, any> =>
  make(I.makeSchema(ast), (input) => {
    // ---------------------------------------------
    // compute encoder candidates
    // ---------------------------------------------
    const encoders: Array<Encoder<any, any>> = []
    for (let i = 0; i < members.length; i++) {
      if (members[i][0].is(input)) {
        encoders.push(members[i][1])
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

const _lazy = <S, A>(
  f: () => Encoder<S, A>
): Encoder<S, A> => {
  const get = I.memoize<void, Encoder<S, A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}
