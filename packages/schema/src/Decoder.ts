/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import * as G from "@fp-ts/codec/Guard"
import * as T from "@fp-ts/codec/internal/These"
import type { LiteralValue } from "@fp-ts/codec/Meta"
import { pipe } from "@fp-ts/data/Function"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export interface Decoder<in I, E, out A> {
  readonly I: (_: I) => void
  readonly E: E
  readonly A: A
  readonly decode: (i: I) => T.These<ReadonlyArray<E>, A>
}

/**
 * @since 1.0.0
 */
export const make = <I, E, A>(decode: Decoder<I, E, A>["decode"]): Decoder<I, E, A> =>
  ({ decode }) as any

/**
 * @since 1.0.0
 */
export const fromRefinement = <A, B extends A, E>(
  is: (a: A) => a is B,
  onFalse: (a: A) => E
): Decoder<A, E, B> => make((a) => is(a) ? succeed(a) : fail(onFalse(a)))

/**
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => T.These<never, A> = T.right

/**
 * @since 1.0.0
 */
export const fail = <E>(e: E): T.These<ReadonlyArray<E>, never> => T.left([e])

/** @internal */
export const flatMap = <A, E2, B>(
  f: (a: A) => T.These<ReadonlyArray<E2>, B>
) =>
  <E1>(self: T.These<ReadonlyArray<E1>, A>): T.These<ReadonlyArray<E1 | E2>, B> => {
    if (T.isLeft(self)) {
      return self
    }
    if (T.isRight(self)) {
      return f(self.right)
    }
    const that = f(self.right)
    if (T.isLeft(that)) {
      return T.left([...self.left, ...that.left])
    }
    if (T.isRight(that)) {
      return T.both(self.left, that.right)
    }
    return T.both([...self.left, ...that.left], that.right)
  }

/**
 * @since 1.0.0
 */
export const compose = <B, E2, C>(bc: Decoder<B, E2, C>) =>
  <A, E1>(ab: Decoder<A, E1, B>): Decoder<A, E1 | E2, C> =>
    make((a) => pipe(ab.decode(a), flatMap(bc.decode)))

/**
 * @since 1.0.0
 */
export const string: Decoder<unknown, DE.Type, string> = fromRefinement(
  G.string.is,
  (u) => DE.type("string", u)
)

/**
 * @since 1.0.0
 */
export const number: Decoder<unknown, DE.Type, number> = fromRefinement(
  G.number.is,
  (u) => DE.type("number", u)
)

/**
 * @since 1.0.0
 */
export const boolean: Decoder<unknown, DE.Type, boolean> = fromRefinement(
  G.boolean.is,
  (u) => DE.type("boolean", u)
)

/**
 * @since 1.0.0
 */
export const literal = <A extends LiteralValue>(
  literal: A
): Decoder<unknown, DE.Equal, A> =>
  fromRefinement(
    G.literal(literal).is,
    (u) => DE.equal(literal, u)
  )

const UnknownArray: Decoder<unknown, DE.Type, ReadonlyArray<unknown>> = make((u) =>
  Array.isArray(u) ? succeed(u) : fail(DE.type("Array", u))
)

/**
 * @since 1.0.0
 */
export const fromTuple = <I, Components extends ReadonlyArray<Decoder<I, unknown, unknown>>>(
  ...components: Components
): Decoder<
  ReadonlyArray<I>,
  DE.Type | Components[number]["E"],
  { readonly [K in keyof Components]: Components[K]["A"] }
> =>
  make(
    (is) => {
      const out: Array<unknown> = []
      for (let i = 0; i < components.length; i++) {
        const t = components[i].decode(is[i])
        if (T.isLeft(t)) {
          return T.left(t.left)
        }
        out[i] = t.right
      }
      return succeed(out as any)
    }
  )

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Decoder<unknown, unknown, unknown>>>(
  ...components: Components
): Decoder<
  unknown,
  DE.Type | Components[number]["E"],
  { readonly [K in keyof Components]: Components[K]["A"] }
> =>
  pipe(
    UnknownArray,
    compose(fromTuple<unknown, Components>(...components))
  )

/**
 * @since 1.0.0
 */
export const fromReadonlyArray = <I, E, A>(
  item: Decoder<I, E, A>
): Decoder<ReadonlyArray<I>, DE.Type | E, ReadonlyArray<A>> =>
  make((is) => {
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
  })

/**
 * @since 1.0.0
 */
export const readonlyArray = <E, A>(
  item: Decoder<unknown, E, A>
): Decoder<unknown, DE.Type | E, ReadonlyArray<A>> =>
  pipe(
    UnknownArray,
    compose(fromReadonlyArray(item))
  )

/**
 * @since 1.0.0
 */
const UnknownIndexSignature: Decoder<unknown, DE.Type, { readonly [_: string]: unknown }> = make((
  u
) =>
  typeof u === "object" && u != null && !Array.isArray(u) ?
    succeed(u as any) :
    fail(DE.type("Object", u))
)

/**
 * @since 1.0.0
 */
export const fromStruct = <I, Fields extends Record<PropertyKey, Decoder<I, any, any>>>(
  fields: Fields
): Decoder<
  { readonly [_: string]: I },
  DE.Type | Fields[keyof Fields]["E"],
  { readonly [K in keyof Fields]: Fields[K]["A"] }
> => {
  const keys = Object.keys(fields)
  return make((input: { readonly [_: string]: I }) => {
    const a = {}
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const t = fields[key].decode(input[key])
      if (T.isLeft(t)) {
        return T.left(t.left)
      }
      a[key] = t.right
    }
    return succeed(a as any)
  })
}

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Decoder<unknown, any, any>>>(
  fields: Fields
): Decoder<
  unknown,
  DE.Type | Fields[keyof Fields]["E"],
  { readonly [K in keyof Fields]: Fields[K]["A"] }
> => {
  return pipe(
    UnknownIndexSignature,
    compose(fromStruct<unknown, Fields>(fields))
  )
}

/**
 * @since 1.0.0
 */
export const union = <I, Members extends ReadonlyArray<Decoder<I, any, any>>>(
  ...members: Members
): Decoder<I, Members[number]["E"], Members[number]["A"]> =>
  make((u) => {
    const lefts: Array<Members[number]["E"]> = []
    for (const member of members) {
      const t = member.decode(u)
      if (T.isRightOrBoth(t)) {
        return t
      }
      lefts.push(...t.left)
    }
    return T.left(lefts)
  })

/**
 * @since 1.0.0
 */
export const fromIndexSignature = <I, E, A>(
  value: Decoder<I, E, A>
): Decoder<{ readonly [_: string]: I }, DE.Type | E, { readonly [_: string]: A }> =>
  make(
    (ri) => {
      const out = {}
      for (const key of Object.keys(ri)) {
        const t = value.decode(ri[key])
        if (T.isLeft(t)) {
          return t
        }
        out[key] = t.right
      }
      return succeed(out as any)
    }
  )

/**
 * @since 1.0.0
 */
export const indexSignature = <E, A>(
  value: Decoder<unknown, E, A>
): Decoder<unknown, DE.Type | E, { readonly [_: string]: A }> =>
  pipe(
    UnknownIndexSignature,
    compose(fromIndexSignature(value))
  )

/**
 * @since 1.0.0
 */
export const refinement = <A, B extends A, E2>(refinement: (a: A) => a is B, onFalse: E2) =>
  <I, E1>(
    self: Decoder<I, E1, A>
  ): Decoder<I, E1 | E2, B> =>
    make((i) => pipe(self.decode(i), flatMap((a) => refinement(a) ? succeed(a) : fail(onFalse))))
