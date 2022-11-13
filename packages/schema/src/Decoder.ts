/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import * as G from "@fp-ts/codec/Guard"
import * as T from "@fp-ts/codec/internal/These"
// import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export interface Decoder<in I, in out A> {
  readonly I: (_: I) => void
  readonly A: (_: A) => A
  readonly decode: (i: I) => T.These<ReadonlyArray<DE.DecodeError>, A>
}

/**
 * @since 1.0.0
 */
export const make = <I, A>(decode: Decoder<I, A>["decode"]): Decoder<I, A> => ({ decode }) as any

/**
 * @since 1.0.0
 */
export const fromRefinement = <A, B extends A>(
  is: (a: A) => a is B,
  onFalse: (a: A) => DE.DecodeError
): Decoder<A, B> => make((a) => is(a) ? succeed(a) : fail(onFalse(a)))

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
export const compose = <B, C>(bc: Decoder<B, C>) =>
  <A>(ab: Decoder<A, B>): Decoder<A, C> => make((a) => pipe(ab.decode(a), flatMap(bc.decode)))

/**
 * @since 1.0.0
 */
export const never: Decoder<unknown, never> = fromRefinement(
  G.never.is,
  (u) => DE.notType("never", u)
)

/**
 * @since 1.0.0
 */
export const unknown: Decoder<unknown, unknown> = fromRefinement(
  G.unknown.is,
  (u) => DE.notType("unknown", u)
)

/**
 * @since 1.0.0
 */
export const any: Decoder<unknown, any> = fromRefinement(
  G.any.is,
  (u) => DE.notType("any", u)
)

/**
 * @since 1.0.0
 */
export const string: Decoder<unknown, string> = fromRefinement(
  G.string.is,
  (u) => DE.notType("string", u)
)

/**
 * @since 1.0.0
 */
export const refinement = <A, B extends A>(refinement: (a: A) => a is B, onFalse: DE.DecodeError) =>
  <I>(self: Decoder<I, A>): Decoder<I, B> =>
    make((i) => pipe(self.decode(i), flatMap((a) => refinement(a) ? succeed(a) : fail(onFalse))))

/**
 * @since 1.0.0
 */
export const filter = <A>(predicate: (a: A) => boolean, onFalse: DE.DecodeError) =>
  <I, B extends A>(self: Decoder<I, B>): Decoder<I, B> =>
    refinement((b: B): b is B => predicate(b), onFalse)(self)

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <I, A extends { length: number }>(self: Decoder<I, A>): Decoder<I, A> =>
    filter((a: A) => a.length >= minLength, DE.minLength(minLength))(self)

/**
 * @since 1.0.0
 */
export const maxLength = (
  maxLength: number
) =>
  <I, A extends { length: number }>(self: Decoder<I, A>): Decoder<I, A> =>
    filter((a: A) => a.length <= maxLength, DE.maxLength(maxLength))(self)

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <I, A extends number>(self: Decoder<I, A>): Decoder<I, A> =>
    filter((a: A) => a >= minimum, DE.minimum(minimum))(self)

/**
 * @since 1.0.0
 */
export const maximum = (
  maximum: number
) =>
  <I, A extends number>(self: Decoder<I, A>): Decoder<I, A> =>
    filter((a: A) => a <= maximum, DE.maximum(maximum))(self)

/**
 * @since 1.0.0
 */
export const number: Decoder<unknown, number> = fromRefinement(
  G.number.is,
  (u) => DE.notType("number", u)
)

/**
 * @since 1.0.0
 */
export const boolean: Decoder<unknown, boolean> = fromRefinement(
  G.boolean.is,
  (u) => DE.notType("boolean", u)
)

/**
 * @since 1.0.0
 */
export const of = <A>(
  value: A
): Decoder<unknown, A> =>
  fromRefinement(
    G.of(value).is,
    (u) => DE.notEqual(value, u)
  )

const UnknownArray: Decoder<unknown, ReadonlyArray<unknown>> = make((u) =>
  Array.isArray(u) ? succeed(u as ReadonlyArray<any>) : fail(DE.notType("Array", u))
)

/**
 * @since 1.0.0
 */
export const fromTuple = <I, Components extends ReadonlyArray<Decoder<I, unknown>>>(
  ...components: Components
): Decoder<
  ReadonlyArray<I>,
  { readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }
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
export const tuple = <Components extends ReadonlyArray<Decoder<unknown, any>>>(
  ...components: Components
): Decoder<unknown, { readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }> =>
  pipe(UnknownArray, compose(fromTuple<unknown, Components>(...components)))

/**
 * @since 1.0.0
 */
export const fromReadonlyArray = <I, A>(
  item: Decoder<I, A>
): Decoder<ReadonlyArray<I>, ReadonlyArray<A>> =>
  make((is) => {
    const es: Array<DE.DecodeError> = []
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
    return T.right(as as ReadonlyArray<A>)
  })

/**
 * @since 1.0.0
 */
export const readonlyArray = <A>(
  item: Decoder<unknown, A>
): Decoder<unknown, ReadonlyArray<A>> => pipe(UnknownArray, compose(fromReadonlyArray(item)))

/**
 * @since 1.0.0
 */
const UnknownIndexSignature: Decoder<unknown, { readonly [_: string]: unknown }> = make((
  u
) =>
  typeof u === "object" && u != null && !Array.isArray(u) ?
    succeed(u as any) :
    fail(DE.notType("Object", u))
)

/**
 * @since 1.0.0
 */
export const fromStruct = <I, Fields extends Record<PropertyKey, Decoder<I, any>>>(
  fields: Fields
): Decoder<
  { readonly [_: string]: I },
  { readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] }
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
export const struct = <Fields extends Record<PropertyKey, Decoder<unknown, any>>>(
  fields: Fields
): Decoder<unknown, { readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] }> => {
  return pipe(
    UnknownIndexSignature,
    compose(fromStruct<unknown, Fields>(fields))
  )
}

/**
 * @since 1.0.0
 */
export const union = <I, Members extends ReadonlyArray<Decoder<I, any>>>(
  ...members: Members
): Decoder<I, Parameters<Members[number]["A"]>[0]> =>
  make((u) => {
    const lefts: Array<DE.DecodeError> = []
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
export const fromIndexSignature = <I, A>(
  value: Decoder<I, A>
): Decoder<{ readonly [_: string]: I }, { readonly [_: string]: A }> =>
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
export const indexSignature = <A>(
  value: Decoder<unknown, A>
): Decoder<unknown, { readonly [_: string]: A }> =>
  pipe(
    UnknownIndexSignature,
    compose(fromIndexSignature(value))
  )
