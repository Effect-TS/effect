/**
 * @since 1.0.0
 */

import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type { Validated } from "@fp-ts/data/These"
import * as AST from "@fp-ts/schema/AST"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Decoder<in S, in out A> extends Schema<A> {
  readonly I: (_: S) => void
  readonly decode: (i: S) => Validated<DE.DecodeError, A>
}

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, decode: Decoder<S, A>["decode"]) => Decoder<S, A> =
  I.makeDecoder

/**
 * @since 1.0.0
 */
export const success = I.success

/**
 * @since 1.0.0
 */
export const failure = I.failure

/**
 * @since 1.0.0
 */
export const failures = I.failures

/**
 * @since 1.0.0
 */
export const warning = I.warning

/**
 * @since 1.0.0
 */
export const warnings = I.warnings

/**
 * @since 1.0.0
 */
export const isFailure = I.isFailure

/**
 * @since 1.0.0
 */
export const isSuccess = I.isSuccess

/**
 * @since 1.0.0
 */
export const map = I.map

/**
 * @since 1.0.0
 */
export const flatMap = I.flatMap

/**
 * @since 1.0.0
 */
export const compose: <B, C>(bc: Decoder<B, C>) => <A>(ab: Decoder<A, B>) => Decoder<A, C> =
  I.compose

/**
 * @since 1.0.0
 */
export const of = <A>(
  value: A
): Decoder<unknown, A> =>
  I.fromRefinement(S.of(value), (u): u is A => u === value, (u) => DE.notEqual(value, u))

/**
 * @since 1.0.0
 */
export const array = <S, A>(
  item: Decoder<S, A>
): Decoder<ReadonlyArray<S>, ReadonlyArray<A>> => _tuple([], O.some([item.ast, item]), true)

/** @internal */
export const _tuple = (
  components: ReadonlyArray<readonly [AST.AST, Decoder<any, any>]>,
  oRestElement: Option<readonly [AST.AST, Decoder<any, any>]>,
  readonly: boolean
): Decoder<any, any> =>
  make(
    S.make(
      AST.tuple(components.map(([c]) => c), pipe(oRestElement, O.map(([re]) => re)), readonly)
    ),
    (us: ReadonlyArray<unknown>) => {
      const out: Array<any> = []
      let es: C.Chunk<DE.DecodeError> = C.empty
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        const decoder = components[i][1]
        const t = decoder.decode(us[i])
        if (isFailure(t)) {
          return failures(I.append(DE.index(i, t.left))(es)) // bail out on a fatal errors
        } else if (isSuccess(t)) {
          out[i] = t.right
        } else {
          es = C.append(DE.index(i, t.left))(es)
          out[i] = t.right
        }
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const decoder = oRestElement.value[1]
        for (; i < us.length; i++) {
          const t = decoder.decode(us[i])
          if (isFailure(t)) {
            return failures(I.append(DE.index(i, t.left))(es)) // bail out on a fatal errors
          } else if (isSuccess(t)) {
            out[i] = t.right
          } else {
            es = C.append(DE.index(i, t.left))(es)
            out[i] = t.right
          }
        }
      } else {
        // ---------------------------------------------
        // handle additional indexes
        // ---------------------------------------------
        for (; i < us.length; i++) {
          es = C.append(DE.unexpectedIndex(i))(es)
        }
      }

      // ---------------------------------------------
      // compute output
      // ---------------------------------------------
      return C.isNonEmpty(es) ? warnings(es, out) : success(out)
    }
  )

/** @internal */
export const _struct = (
  fields: ReadonlyArray<readonly [AST.Field, Decoder<any, any>]>,
  oStringIndexSignature: Option<readonly [AST.IndexSignature, Decoder<any, any>]>
): Decoder<any, any> =>
  make(
    S.make(
      AST.struct(fields.map(([f]) => f), pipe(oStringIndexSignature, O.map(([is]) => is)))
    ),
    (us: { readonly [_: string | symbol]: unknown }) => {
      const out: any = {}
      const fieldKeys = {}
      let es: C.Chunk<DE.DecodeError> = C.empty
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
        const decoder = fields[i][1]
        const t = decoder.decode(us[key])
        if (isFailure(t)) {
          return failures(I.append(DE.key(key, t.left))(es)) // bail out on a fatal errors
        } else if (isSuccess(t)) {
          out[key] = t.right
        } else {
          es = C.append(DE.key(key, t.left))(es)
          out[key] = t.right
        }
      }
      // ---------------------------------------------
      // handle index signature
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature)) {
        const decoder = oStringIndexSignature.value[1]
        for (const key of Object.keys(us)) {
          const t = decoder.decode(us[key])
          if (isFailure(t)) {
            return failures(I.append(DE.key(key, t.left))(es)) // bail out on a fatal errors
          } else if (isSuccess(t)) {
            out[key] = t.right
          } else {
            es = C.append(DE.key(key, t.left))(es)
            out[key] = t.right
          }
        }
      } else {
        // ---------------------------------------------
        // handle additional keys
        // ---------------------------------------------
        for (const key of Object.keys(us)) {
          if (!(key in fieldKeys)) {
            es = C.append(DE.unexpectedKey(key))(es)
          }
        }
      }

      // ---------------------------------------------
      // compute output
      // ---------------------------------------------
      return C.isNonEmpty(es) ? warnings(es, out) : success(out)
    }
  )

/**
 * @since 1.0.0
 */
export const union = <I, Members extends ReadonlyArray<Decoder<I, any>>>(
  ...members: Members
): Decoder<I, S.Infer<Members[number]>> =>
  make(S.union(...members), (u) => {
    let es: C.Chunk<DE.DecodeError> = C.empty
    for (let i = 0; i < members.length; i++) {
      const t = members[i].decode(u)
      if (!isFailure(t)) {
        return t
      }
      es = C.append(DE.member(i, t.left))(es)
    }
    return C.isNonEmpty(es) ? failures(es) : failure(DE.notType("never", u))
  })

/**
 * @since 1.0.0
 */
export const lazy = <S, A>(
  f: () => Decoder<S, A>
): Decoder<S, A> => {
  const get = S.memoize<void, Decoder<S, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().decode(a)
  )
}
