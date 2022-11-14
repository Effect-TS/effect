/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import * as G from "@fp-ts/codec/Guard"
import * as T from "@fp-ts/codec/internal/These"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export interface Decoder<in I, in out A> extends Schema<A> {
  readonly I: (_: I) => void
  readonly decode: (i: I) => T.These<ReadonlyArray<DE.DecodeError>, A>
}

/**
 * @since 1.0.0
 */
export const make = <I, A>(schema: Schema<A>, decode: Decoder<I, A>["decode"]): Decoder<I, A> =>
  ({ meta: schema.meta, decode }) as any

/**
 * @since 1.0.0
 */
export const fromGuard = <A>(
  guard: G.Guard<A>,
  onFalse: (u: unknown) => DE.DecodeError
): Decoder<unknown, A> => make(guard, (u) => guard.is(u) ? succeed(u) : fail(onFalse(u)))

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
  <A>(ab: Decoder<A, B>): Decoder<A, C> => make(bc, (a) => pipe(ab.decode(a), flatMap(bc.decode)))

/**
 * @since 1.0.0
 */
export const never: Decoder<unknown, never> = fromGuard(
  G.never,
  (u) => DE.notType("never", u)
)

/**
 * @since 1.0.0
 */
export const unknown: Decoder<unknown, unknown> = fromGuard(
  G.unknown,
  (u) => DE.notType("unknown", u)
)

/**
 * @since 1.0.0
 */
export const any: Decoder<unknown, any> = fromGuard(
  G.any,
  (u) => DE.notType("any", u)
)

/**
 * @since 1.0.0
 */
export const string: Decoder<unknown, string> = fromGuard(
  G.string,
  (u) => DE.notType("string", u)
)

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <I, A extends { length: number }>(self: Decoder<I, A>): Decoder<I, A> =>
    make(
      S.minLength(minLength)(self),
      (i) =>
        pipe(
          self.decode(i),
          flatMap((a) => a.length >= minLength ? succeed(a) : fail(DE.minLength(minLength)))
        )
    )

/**
 * @since 1.0.0
 */
export const maxLength = (
  maxLength: number
) =>
  <I, A extends { length: number }>(self: Decoder<I, A>): Decoder<I, A> =>
    make(
      S.maxLength(maxLength)(self),
      (i) =>
        pipe(
          self.decode(i),
          flatMap((a) => a.length <= maxLength ? succeed(a) : fail(DE.maxLength(maxLength)))
        )
    )

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <I, A extends number>(self: Decoder<I, A>): Decoder<I, A> =>
    make(
      S.minimum(minimum)(self),
      (i) =>
        pipe(
          self.decode(i),
          flatMap((a) => a >= minimum ? succeed(a) : fail(DE.minimum(minimum)))
        )
    )

/**
 * @since 1.0.0
 */
export const maximum = (
  maximum: number
) =>
  <I, A extends number>(self: Decoder<I, A>): Decoder<I, A> =>
    make(
      S.maximum(maximum)(self),
      (i) =>
        pipe(
          self.decode(i),
          flatMap((a) => a <= maximum ? succeed(a) : fail(DE.maximum(maximum)))
        )
    )

/**
 * @since 1.0.0
 */
export const number: Decoder<unknown, number> = fromGuard(
  G.number,
  (u) => DE.notType("number", u)
)

/**
 * @since 1.0.0
 */
export const boolean: Decoder<unknown, boolean> = fromGuard(
  G.boolean,
  (u) => DE.notType("boolean", u)
)

/**
 * @since 1.0.0
 */
export const of = <A>(
  value: A
): Decoder<unknown, A> =>
  fromGuard(
    G.of(value),
    (u) => DE.notEqual(value, u)
  )

const UnknownArray: Decoder<unknown, ReadonlyArray<unknown>> = make(
  S.array(true, S.unknown),
  (u) => Array.isArray(u) ? succeed(u as ReadonlyArray<unknown>) : fail(DE.notType("Array", u))
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
    S.tuple(true, ...components),
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
  make(S.array(true, item), (is) => {
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
const UnknownIndexSignature: Decoder<unknown, { readonly [_: string]: unknown }> = make(
  S.indexSignature(S.unknown),
  (
    u
  ) =>
    typeof u === "object" && u != null && !Array.isArray(u) ?
      succeed(u as { readonly [_: string]: unknown }) :
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
  const schemas = {}
  keys.forEach((key) => {
    schemas[key] = fields[key]
  })
  return make(S.struct(schemas), (input: { readonly [_: string]: I }) => {
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
  make(S.union(...members), (u) => {
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
  make(S.indexSignature(value), (ri) => {
    const out = {}
    for (const key of Object.keys(ri)) {
      const t = value.decode(ri[key])
      if (T.isLeft(t)) {
        return t
      }
      out[key] = t.right
    }
    return succeed(out as any)
  })

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

/**
 * @since 1.0.0
 */
export const lazy = <I, A>(
  symbol: symbol,
  f: () => Decoder<I, A>
): Decoder<I, A> => {
  const get = S.memoize<void, Decoder<I, A>>(f)
  const schema = S.lazy(symbol, f)
  return make(
    schema,
    (a) => get().decode(a)
  )
}
