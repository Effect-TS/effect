/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as AST from "@fp-ts/schema/AST"
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
  components: ReadonlyArray<[AST.AST, Encoder<any, any>]>,
  oRestElement: Option<[AST.AST, Encoder<any, any>]>,
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
