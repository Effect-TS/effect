/**
 * @since 1.0.0
 */

import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import type { These } from "@fp-ts/data/These"
import type * as AST from "@fp-ts/schema/AST"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Decoder<in S, in out A> extends Schema<A> {
  readonly I: (_: S) => void
  readonly decode: (i: S) => These<NonEmptyReadonlyArray<DE.DecodeError>, A>
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
export const isSuccess = I.isSuccess

/**
 * @since 1.0.0
 */
export const isFailure = I.isFailure

/**
 * @since 1.0.0
 */
export const isWarning = I.isWarning

// ---------------------------------------------
// internal
// ---------------------------------------------

/** @internal */
export const _of = <A>(
  value: A
): Decoder<unknown, A> =>
  I.fromRefinement(S.of(value), (u): u is A => u === value, (u) => DE.notEqual(value, u))

/** @internal */
export const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Decoder<any, any>>,
  oRestElement: Option<Decoder<any, any>>
): Decoder<any, any> =>
  make(
    S.make(ast),
    (us: ReadonlyArray<unknown>) => {
      const out: Array<any> = []
      const es: Array<DE.DecodeError> = []
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        const decoder = components[i]
        const t = decoder.decode(us[i])
        if (isFailure(t)) {
          return failures(I.append(es, DE.index(i, t.left))) // bail out on a fatal errors
        } else if (isWarning(t)) {
          es.push(DE.index(i, t.left))
        }
        out[i] = t.right
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const decoder = oRestElement.value
        for (; i < us.length; i++) {
          const t = decoder.decode(us[i])
          if (isFailure(t)) {
            return failures(I.append(es, DE.index(i, t.left))) // bail out on a fatal errors
          } else if (isWarning(t)) {
            es.push(DE.index(i, t.left))
          }
          out[i] = t.right
        }
      } else {
        // ---------------------------------------------
        // handle additional indexes
        // ---------------------------------------------
        for (; i < us.length; i++) {
          es.push(DE.unexpectedIndex(i))
        }
      }

      // ---------------------------------------------
      // compute output
      // ---------------------------------------------
      return I.isNonEmpty(es) ? warnings(es, out) : success(out)
    }
  )

/** @internal */
export const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Decoder<any, any>>,
  oStringIndexSignature: Option<Decoder<any, any>>
): Decoder<any, any> =>
  make(
    S.make(ast),
    (input: { readonly [_: string | symbol]: unknown }) => {
      const output: any = {}
      const processedKeys = {}
      const es: Array<DE.DecodeError> = []
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        processedKeys[key] = null
        // ---------------------------------------------
        // handle optional fields
        // ---------------------------------------------
        const optional = field.optional
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
        const decoder = fields[i]
        const t = decoder.decode(input[key])
        if (isFailure(t)) {
          return failures(I.append(es, DE.key(key, t.left))) // bail out on a fatal errors
        } else if (isWarning(t)) {
          es.push(DE.key(key, t.left))
        }
        output[key] = t.right
      }
      const keys = Object.keys(input)
      if (keys.length > fields.length) {
        // ---------------------------------------------
        // handle index signature
        // ---------------------------------------------
        if (O.isSome(oStringIndexSignature)) {
          const decoder = oStringIndexSignature.value
          for (const key of keys) {
            const t = decoder.decode(input[key])
            if (isFailure(t)) {
              return failures(I.append(es, DE.key(key, t.left))) // bail out on a fatal errors
            } else if (isWarning(t)) {
              es.push(DE.key(key, t.left))
            }
            output[key] = t.right
          }
        } else {
          // ---------------------------------------------
          // handle additional keys
          // ---------------------------------------------
          for (const key of keys) {
            if (!(Object.prototype.hasOwnProperty.call(processedKeys, key))) {
              es.push(DE.unexpectedKey(key))
            }
          }
        }
      }

      // ---------------------------------------------
      // compute output
      // ---------------------------------------------
      return I.isNonEmpty(es) ? warnings(es, output) : success(output)
    }
  )

/** @internal */
export const _union = <I, Members extends ReadonlyArray<Decoder<I, any>>>(
  ast: AST.Union,
  members: Members
): Decoder<I, S.Infer<Members[number]>> =>
  make(S.make(ast), (u) => {
    const es: Array<DE.DecodeError> = []
    for (let i = 0; i < members.length; i++) {
      const t = members[i].decode(u)
      if (!isFailure(t)) {
        return t
      }
      es.push(DE.member(i, t.left))
    }
    return I.isNonEmpty(es) ? failures(es) : failure(DE.notType("never", u))
  })

/** @internal */
export const _lazy = <I, A>(
  f: () => Decoder<I, A>
): Decoder<I, A> => {
  const get = S.memoize<void, Decoder<I, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().decode(a)
  )
}
