/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import type { LiteralValue } from "@fp-ts/codec/Meta"
import * as T from "@fp-ts/codec/These"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export interface Decoder<in out Whole, E, out A> {
  readonly decode: (whole: Whole) => T.These<ReadonlyArray<E>, A>
}

export type InputOf<D> = D extends Decoder<infer I, any, any> ? I : never
export type ErrorOf<D> = D extends Decoder<any, infer E, any> ? E : never
export type TypeOf<D> = D extends Decoder<any, any, infer A> ? A : never

/**
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => T.These<never, A> = T.right

/**
 * @since 1.0.0
 */
export const fail = <E>(e: E): T.These<ReadonlyArray<E>, never> => T.left([e])

/**
 * @since 1.0.0
 */
export const string: Decoder<unknown, DE.NotType, string> = {
  decode: (i) => typeof i === "string" ? succeed(i) : fail(DE.notType("string", i))
}

/**
 * @since 1.0.0
 */
export const number: Decoder<unknown, DE.NotType, number> = {
  decode: (i) => typeof i === "number" ? succeed(i) : fail(DE.notType("number", i))
}

/**
 * @since 1.0.0
 */
export const boolean: Decoder<unknown, DE.NotType, boolean> = {
  decode: (i) => typeof i === "boolean" ? succeed(i) : fail(DE.notType("boolean", i))
}

const isEqual = <A extends LiteralValue>(i: unknown, a: A): i is A => i === a

/**
 * @since 1.0.0
 */
export const literal = <A extends LiteralValue>(
  literal: A
): Decoder<unknown, DE.NotEqual<A>, A> => ({
  decode: (i) => isEqual(i, literal) ? succeed(i) : fail(DE.notEqual(literal, i))
})

/**
 * @since 1.0.0
 */
export const readonlyArray = <I, E, A>(
  item: Decoder<I, E, A>
): Decoder<ReadonlyArray<I>, E, ReadonlyArray<A>> => ({
  decode: (is) => {
    const es: Array<E> = []
    const as: Array<A> = []
    let isBoth = true
    for (let index = 0; index < is.length; index++) {
      const t = item.decode(is[index])
      if (T.isLeft(t)) {
        isBoth = false
        es.push(...t.left)
        break // bail out on a fatal errors
      } else if (T.isRight(t)) {
        as.push(t.right)
      } else {
        es.push(...t.left)
        as.push(t.right)
      }
    }
    if (isNonEmpty(es)) {
      return isBoth ? T.both(es, as) : T.left(es)
    }
    return T.right(as)
  }
})

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Decoder<any, any, any>>>(
  fields: Fields
): Decoder<
  { readonly [K in keyof Fields]: InputOf<Fields[K]> },
  { readonly [K in keyof Fields]: ErrorOf<Fields[K]> }[keyof Fields],
  { readonly [K in keyof Fields]: TypeOf<Fields[K]> }
> => {
  const keys = Object.keys(fields)
  return {
    decode: (input: { [_: string]: unknown }) => {
      const a = {}
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const t = fields[key].decode(input[key])
        if (T.isLeft(t)) {
          return T.left(t.left)
        }
        a[key] = t.right
      }
      return succeed(a)
    }
  } as any
}
