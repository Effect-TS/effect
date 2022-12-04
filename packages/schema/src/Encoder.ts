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
  oStringIndexSignature: Option<Encoder<any, any>>
): Encoder<any, any> =>
  make(
    S.make(ast),
    (us: { readonly [_: string | symbol]: unknown }) => {
      const out: any = {}
      const fieldKeys = {}
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
          if (!Object.prototype.hasOwnProperty.call(us, key)) {
            continue
          }
          if (us[key] === undefined) {
            out[key] = undefined
            continue
          }
        }
        // ---------------------------------------------
        // handle required fields
        // ---------------------------------------------
        const encoder = fields[i]
        out[key] = encoder.encode(us[key])
      }
      // ---------------------------------------------
      // handle index signature
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature)) {
        const encoder = oStringIndexSignature.value
        for (const key of Object.keys(us)) {
          if (!(key in fieldKeys)) {
            out[key] = encoder.encode(us[key])
          }
        }
      }

      return out
    }
  )

/** @internal */
export const _union = (
  ast: AST.Union,
  encoders: ReadonlyArray<readonly [Guard<any>, Encoder<any, any>]>
): Encoder<any, any> =>
  make(S.make(ast), (a) => {
    const index = encoders.findIndex(([guard]) => guard.is(a))
    return encoders[index][1].encode(a)
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
