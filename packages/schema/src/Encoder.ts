/**
 * @since 1.0.0
 */

import { identity } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type * as AST from "@fp-ts/schema/AST"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Encoder<out S, in out A> extends Schema<A> {
  readonly encode: (value: A) => S
}

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, encode: Encoder<S, A>["encode"]) => Encoder<S, A> =
  I.makeEncoder

// ---------------------------------------------
// internal
// ---------------------------------------------

/** @internal */
export const _of = <A>(
  value: A
): Encoder<A, A> => make(S.of(value), identity)

/** @internal */
export const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Encoder<any, any>>,
  oRestElement: Option<Encoder<any, any>>
): Encoder<any, any> =>
  make(
    S.make(ast),
    (us: ReadonlyArray<unknown>) => {
      const out: Array<any> = []
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        const encoder = components[i]
        out[i] = encoder.encode(us[i])
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const encoder = oRestElement.value
        for (; i < us.length; i++) {
          out[i] = encoder.encode(us[i])
        }
      }

      return out
    }
  )

/** @internal */
export const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Encoder<any, any>>,
  oStringIndexSignature: Option<Encoder<any, any>>,
  oSymbolIndexSignature: Option<Encoder<any, any>>
): Encoder<any, any> =>
  make(
    S.make(ast),
    (input: { readonly [_: string | symbol]: unknown }) => {
      const output: any = {}
      const fieldKeys: any = {}
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const key = ast.fields[i].key
        fieldKeys[key] = null
        // ---------------------------------------------
        // handle optional fields
        // ---------------------------------------------
        const optional = ast.fields[i].optional
        if (optional) {
          if (!Object.prototype.hasOwnProperty.call(input, key)) {
            continue
          }
          if (input[key] === undefined) {
            output[key] = undefined
            continue
          }
        }
        // ---------------------------------------------
        // handle required fields
        // ---------------------------------------------
        const encoder = fields[i]
        output[key] = encoder.encode(input[key])
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature)) {
        const encoder = oStringIndexSignature.value
        for (const key of Object.keys(input)) {
          if (!(key in fieldKeys)) {
            output[key] = encoder.encode(input[key])
          }
        }
      }
      if (O.isSome(oSymbolIndexSignature)) {
        const encoder = oSymbolIndexSignature.value
        for (const key of Object.getOwnPropertySymbols(input)) {
          if (!(key in fieldKeys)) {
            output[key] = encoder.encode(input[key])
          }
        }
      }

      return output
    }
  )

/** @internal */
export const _union = (
  ast: AST.Union,
  members: ReadonlyArray<readonly [Guard<any>, Encoder<any, any>]>
): Encoder<any, any> =>
  make(S.make(ast), (a) => {
    const index = members.findIndex(([guard]) => guard.is(a))
    return members[index][1].encode(a)
  })

/** @internal */
export const _lazy = <S, A>(
  f: () => Encoder<S, A>
): Encoder<S, A> => {
  const get = S.memoize<void, Encoder<S, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}
