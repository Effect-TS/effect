/**
 * @since 1.0.0
 */

import * as C from "@fp-ts/data/Chunk"
import type { Validated } from "@fp-ts/data/These"
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
export const fromTuple = <S, Components extends ReadonlyArray<Decoder<S, unknown>>>(
  ...components: Components
): Decoder<
  ReadonlyArray<S>,
  { readonly [K in keyof Components]: S.Infer<Components[K]> }
> =>
  make(
    S.tuple(...components),
    (is) => {
      const out: any = []
      for (let i = 0; i < components.length; i++) {
        const t = components[i].decode(is[i])
        if (isFailure(t)) {
          return failure(DE.index(i, t.left))
        }
        out[i] = t.right // TODO: handle warnings
      }
      return success(out)
    }
  )

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
export const fromArray = <S, A>(
  item: Decoder<S, A>
): Decoder<ReadonlyArray<S>, ReadonlyArray<A>> =>
  make(S.array(item), (is) => {
    let es: C.Chunk<DE.DecodeError> = C.empty
    const as: Array<A> = []
    let isBoth = true
    for (let i = 0; i < is.length; i++) {
      const t = item.decode(is[i])
      if (isFailure(t)) {
        isBoth = false
        es = C.append(DE.index(i, t.left))(es)
        break // bail out on a fatal errors
      } else if (isSuccess(t)) {
        as.push(t.right)
      } else {
        es = C.append(DE.index(i, t.left))(es)
        as.push(t.right)
      }
    }
    if (C.isNonEmpty(es)) {
      return isBoth ? warnings(es, as) : failures(es)
    }
    return success(as)
  })

/**
 * @since 1.0.0
 */
export const fromStruct = <S, Fields extends Record<PropertyKey, Decoder<S, any>>>(
  fields: Fields
): Decoder<
  { readonly [_: string]: S },
  { readonly [K in keyof Fields]: S.Infer<Fields[K]> }
> => {
  const keys = Object.keys(fields)
  return make(S.struct(fields), (input: { readonly [_: string]: S }) => {
    const a: any = {}
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const t = fields[key].decode(input[key])
      if (isFailure(t)) {
        return t
      }
      a[key] = t.right // TODO handle both
    }
    return success(a)
  })
}

/**
 * @since 1.0.0
 */
export const fromStringIndexSignature = <S, A>(
  value: Decoder<S, A>
): Decoder<{ readonly [_: string]: S }, { readonly [_: string]: A }> =>
  make(S.stringIndexSignature(value), (ri) => {
    const out: any = {}
    for (const key of Object.keys(ri)) {
      const t = value.decode(ri[key])
      if (isFailure(t)) {
        return t
      }
      out[key] = t.right
    }
    return success(out)
  })

/**
 * @since 1.0.0
 */
export const union = <I, Members extends ReadonlyArray<Decoder<I, any>>>(
  ...members: Members
): Decoder<I, S.Infer<Members[number]>> =>
  make(S.union(...members), (u) => {
    let es: C.Chunk<DE.DecodeError> = C.empty
    for (const member of members) {
      const t = member.decode(u)
      if (!isFailure(t)) {
        return t
      }
      es = C.concat(t.left)(es)
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
