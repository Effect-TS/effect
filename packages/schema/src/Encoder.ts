/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as AST from "@fp-ts/schema/AST"
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

/** @internal */
export const _tuple = (
  components: ReadonlyArray<readonly [AST.AST, Encoder<any, any>]>,
  oRestElement: Option<readonly [AST.AST, Encoder<any, any>]>,
  readonly: boolean
): Encoder<any, any> =>
  make(
    S.make(
      AST.tuple(components.map(([c]) => c), pipe(oRestElement, O.map(([re]) => re)), readonly)
    ),
    (us: ReadonlyArray<unknown>) => {
      const out: Array<any> = []
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        const encoder = components[i][1]
        out[i] = encoder.encode(us[i])
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const encoder = oRestElement.value[1]
        for (; i < us.length; i++) {
          out[i] = encoder.encode(us[i])
        }
      }

      return out
    }
  )

/** @internal */
export const _struct = (
  fields: ReadonlyArray<readonly [AST.Field, Encoder<any, any>]>,
  oStringIndexSignature: Option<readonly [AST.IndexSignature, Encoder<any, any>]>
): Encoder<any, any> =>
  make(
    S.make(
      AST.struct(fields.map(([f]) => f), pipe(oStringIndexSignature, O.map(([is]) => is)))
    ),
    (us: { readonly [_: string | symbol]: unknown }) => {
      const out: any = {}
      const fieldKeys = {}
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const key = fields[i][0].key
        fieldKeys[key] = null
        // ---------------------------------------------
        // handle optional fields
        // ---------------------------------------------
        const optional = fields[i][0].optional
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
        const encoder = fields[i][1]
        out[key] = encoder.encode(us[key])
      }
      // ---------------------------------------------
      // handle index signature
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature)) {
        const encoder = oStringIndexSignature.value[1]
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

/**
 * @since 1.0.0
 */
export const lazy = <S, A>(
  f: () => Encoder<S, A>
): Encoder<S, A> => {
  const get = S.memoize<void, Encoder<S, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}
