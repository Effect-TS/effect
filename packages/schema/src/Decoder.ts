/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import type { Literal } from "@fp-ts/codec/DSL"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as T from "@fp-ts/codec/These"

/**
 * @since 1.0.0
 */
export interface Decoder<I, O, E, A> {
  readonly schema: Schema<I, O, E, A>
  readonly decode: (input: I) => T.These<ReadonlyArray<E>, A>
}

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
export const string: Decoder<unknown, string, DE.NotType, string> = {
  schema: S.string,
  decode: (i) => typeof i === "string" ? succeed(i) : fail(DE.notType("string", i))
}

/**
 * @since 1.0.0
 */
export const number: Decoder<unknown, number, DE.NotType, number> = {
  schema: S.number,
  decode: (i) => typeof i === "number" ? succeed(i) : fail(DE.notType("number", i))
}

/**
 * @since 1.0.0
 */
export const boolean: Decoder<unknown, boolean, DE.NotType, boolean> = {
  schema: S.boolean,
  decode: (i) => typeof i === "boolean" ? succeed(i) : fail(DE.notType("boolean", i))
}

const isEqual = <A extends Literal>(i: unknown, a: A): i is A => i === a

/**
 * @since 1.0.0
 */
export const literal = <A extends Literal>(
  literal: A
): Decoder<unknown, A, DE.NotEqual<A>, A> => ({
  schema: S.literal(literal),
  decode: (i) => isEqual(i, literal) ? succeed(i) : fail(DE.notEqual(literal, i))
})

/**
 * @since 1.0.0
 */
export const readonlyArray = <I, O, E, A>(
  item: Decoder<I, O, E, A>
): Decoder<ReadonlyArray<I>, ReadonlyArray<A>, E, ReadonlyArray<A>> => ({
  schema: S.readonlyArray(item.schema),
  decode: (is) => {
    const rights: Array<A> = []
    for (const i of is) {
      const result = item.decode(i)
      if (T.isLeft(result)) {
        return T.left(result.left)
      }
      rights.push(result.right)
    }
    return succeed(rights)
  }
})
