/**
 * @since 1.0.0
 */

import type { AST } from "@fp-ts/codec/AST"
import * as DE from "@fp-ts/codec/DecodeError"
import * as G from "@fp-ts/codec/Guard"
import { DecoderId } from "@fp-ts/codec/internal/Interpreter"
import { isUnknownArray, isUnknownIndexSignature } from "@fp-ts/codec/internal/Refinement"
import * as T from "@fp-ts/codec/internal/These"
import type { Provider } from "@fp-ts/codec/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
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
  ({ ast: schema.ast, decode }) as any

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

/**
 * @since 1.0.0
 */
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

/**
 * @since 1.0.0
 */
export const fromTuple = <I, Components extends ReadonlyArray<Decoder<I, unknown>>>(
  ...components: Components
): Decoder<
  ReadonlyArray<I>,
  { readonly [K in keyof Components]: S.Infer<Components[K]> }
> =>
  make(
    S.tuple(...components),
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
): Decoder<unknown, { readonly [K in keyof Components]: S.Infer<Components[K]> }> => {
  const decoder = fromTuple<unknown, Components>(...components)
  return make(
    S.tuple<Components>(...components),
    (us) => {
      if (!isUnknownArray(us)) {
        return fail(DE.notType("Array", us))
      }
      return decoder.decode(us)
    }
  )
}

/**
 * @since 1.0.0
 */
export const fromArray = <I, A>(
  item: Decoder<I, A>
): Decoder<ReadonlyArray<I>, ReadonlyArray<A>> =>
  make(S.array(item), (is) => {
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
export const array = <A>(
  item: Decoder<unknown, A>
): Decoder<unknown, ReadonlyArray<A>> => {
  const decoder = fromArray(item)
  return make(
    S.array(item),
    (u) => {
      if (!isUnknownArray(u)) {
        return fail(DE.notType("Array", u))
      }
      return decoder.decode(u)
    }
  )
}

/**
 * @since 1.0.0
 */
export const fromStruct = <I, Fields extends Record<PropertyKey, Decoder<I, any>>>(
  fields: Fields
): Decoder<
  { readonly [_: string]: I },
  { readonly [K in keyof Fields]: S.Infer<Fields[K]> }
> => {
  const keys = Object.keys(fields)
  return make(S.struct(fields), (input: { readonly [_: string]: I }) => {
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
): Decoder<unknown, { readonly [K in keyof Fields]: S.Infer<Fields[K]> }> => {
  const decoder = fromStruct(fields)
  return make(S.struct(fields), (u) => {
    if (!isUnknownIndexSignature(u)) {
      return fail(DE.notType("Object", u))
    }
    return decoder.decode(u)
  })
}

/**
 * @since 1.0.0
 */
export const union = <I, Members extends ReadonlyArray<Decoder<I, any>>>(
  ...members: Members
): Decoder<I, S.Infer<Members[number]>> =>
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
): Decoder<unknown, { readonly [_: string]: A }> => {
  const decoder = fromIndexSignature(value)
  return make(S.indexSignature(value), (u) => {
    if (!isUnknownIndexSignature(u)) {
      return fail(DE.notType("Object", u))
    }
    return decoder.decode(u)
  })
}

/**
 * @since 1.0.0
 */
export const lazy = <I, A>(
  f: () => Decoder<I, A>
): Decoder<I, A> => {
  const get = S.memoize<void, Decoder<I, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().decode(a)
  )
}

/**
 * @since 1.0.0
 */
export interface DecoderHandler {
  (...decoders: ReadonlyArray<Decoder<unknown, any>>): Decoder<unknown, any>
}

/**
 * @since 1.0.0
 */
export const provideUnsafeDecoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Decoder<unknown, A> => {
    const go = (ast: AST): Decoder<unknown, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(provider)(ast.provider)
          const handler: O.Option<DecoderHandler> = findHandler(
            merge,
            DecoderId,
            ast.id
          )
          if (O.isSome(handler)) {
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Decoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "String": {
          let out = string
          if (ast.minLength !== undefined) {
            out = minLength(ast.minLength)(out)
          }
          if (ast.maxLength !== undefined) {
            out = maxLength(ast.maxLength)(out)
          }
          return out
        }
        case "Number": {
          let out = number
          if (ast.minimum !== undefined) {
            out = minimum(ast.minimum)(out)
          }
          if (ast.maximum !== undefined) {
            out = maximum(ast.maximum)(out)
          }
          return out
        }
        case "Boolean":
          return boolean
        case "Of":
          return of(ast.value)
        case "Tuple": {
          const components = ast.components.map(go)
          // TODO
          // const oRestElement = pipe(ast.restElement, O.map(go))
          return tuple(...components)
        }
        case "Union":
          return union(...ast.members.map(go))
        case "Struct": {
          const fields: Record<PropertyKey, Decoder<unknown, any>> = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          // TODO
          // const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return struct(fields)
        }
        case "Lazy":
          return lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const unsafeDecoderFor: <A>(schema: Schema<A>) => Decoder<unknown, A> =
  provideUnsafeDecoderFor(empty)
