/**
 * @since 1.0.0
 */

import type { AST } from "@fp-ts/codec/AST"
import * as DE from "@fp-ts/codec/DecodeError"
import * as G from "@fp-ts/codec/Guard"
import { DecoderId } from "@fp-ts/codec/internal/Interpreter"
import * as T from "@fp-ts/codec/internal/These"
import type { Provider } from "@fp-ts/codec/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as schemable from "@fp-ts/codec/typeclass/Schemable"
import type { TypeLambda } from "@fp-ts/core/HKT"
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
export interface DecoderTypeLambda extends TypeLambda {
  readonly type: Decoder<this["In"], this["Target"]>
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
export const warn = <E, A>(e: E, a: A): T.These<ReadonlyArray<E>, A> => T.both([e], a)

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
export const unknown: Decoder<unknown, unknown> = fromGuard(
  G.unknown,
  (u) => DE.notType("unknown", u)
)

/**
 * @since 1.0.0
 */
export const UnknownArray: Decoder<unknown, ReadonlyArray<unknown>> = fromGuard(
  G.UnknownArray,
  (u) => DE.notType("ReadonlyArray<unknown>", u)
)

/**
 * @since 1.0.0
 */
export const UnknownIndexSignature: Decoder<unknown, { readonly [_: string]: unknown }> = fromGuard(
  G.UnknownIndexSignature,
  (u) => DE.notType("{ readonly [_: string]: unknown }", u)
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
export const number: Decoder<unknown, number> = make(
  S.number,
  (u) => G.number.is(u) ? isNaN(u) ? warn(DE.nan, u) : succeed(u) : fail(DE.notType("number", u))
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
        out[i] = t.right // TODO: handle warnings
      }
      return succeed(out as any)
    }
  )

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
        return t
      }
      a[key] = t.right // TODO handle both
    }
    return succeed(a as any)
  })
}

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
        case "Unknown":
          return unknown
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
          return make(
            S.make(ast),
            (u) => u === ast.value ? succeed(u) : fail(DE.notEqual(ast.value, u))
          )
        case "Tuple": {
          const decoder = fromTuple(...ast.components.map(go))
          const oRestElement = pipe(ast.restElement, O.map(go))
          return pipe(
            UnknownArray,
            compose(make(
              S.make(ast),
              (us) => {
                const t = decoder.decode(us)
                if (O.isSome(oRestElement)) {
                  const restElement = fromArray(oRestElement.value)
                  return pipe(
                    t,
                    flatMap((as) =>
                      pipe(
                        restElement.decode(us.slice(ast.components.length)),
                        T.map((rest) => [...as, ...rest])
                      )
                    )
                  )
                }
                return t
              }
            ))
          )
        }
        case "Union": {
          const members = ast.members.map(go)
          return make(S.make(ast), (u) => {
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
        }
        case "Struct": {
          const fields: Record<PropertyKey, Decoder<unknown, any>> = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          const decoder = fromStruct(fields)
          return pipe(
            UnknownIndexSignature,
            compose(make(S.make(ast), (u) => {
              const t = decoder.decode(u)
              if (O.isSome(oIndexSignature)) {
                const indexSignature = fromIndexSignature(oIndexSignature.value)
                return pipe(
                  t,
                  flatMap((out) =>
                    pipe(
                      indexSignature.decode(u),
                      T.map((rest) => ({ ...out, ...rest }))
                    )
                  )
                )
              }
              return t
            }))
          )
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

/**
 * @since 1.0.0
 */
export const Schemable: schemable.Schemable<DecoderTypeLambda> = {
  fromSchema: unsafeDecoderFor
}

/**
 * @since 1.0.0
 */
export const of: <A>(a: A) => Decoder<unknown, A> = schemable.of(Schemable)

/**
 * @since 1.0.0
 */
export const tuple: <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
) => Decoder<unknown, { readonly [K in keyof Components]: S.Infer<Components[K]> }> = schemable
  .tuple(Schemable)

/**
 * @since 1.0.0
 */
export const union: <I, Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Decoder<I, S.Infer<Members[number]>> = schemable
  .union(Schemable)

/**
 * @since 1.0.0
 */
export const struct: <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) => Decoder<unknown, { readonly [K in keyof Fields]: S.Infer<Fields[K]> }> = schemable
  .struct(Schemable)

/**
 * @since 1.0.0
 */
export const indexSignature: <A>(value: Schema<A>) => Decoder<unknown, {
  readonly [_: string]: A
}> = schemable.indexSignature(Schemable)

/**
 * @since 1.0.0
 */
export const array: <A>(item: Schema<A>) => Decoder<unknown, ReadonlyArray<A>> = schemable
  .array(Schemable)

/**
 * @since 1.0.0
 */
export const nativeEnum: <A extends { [_: string]: string | number }>(
  nativeEnum: A
) => Decoder<unknown, A> = schemable.nativeEnum(Schemable)

/**
 * @since 1.0.0
 */
export const optional: <A>(self: Schema<A>) => Decoder<unknown, A | undefined> = schemable
  .optional(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullable: <A>(self: Schema<A>) => Decoder<unknown, A | null> = schemable
  .nullable(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullish: <A>(self: Schema<A>) => Decoder<unknown, A | null | undefined> = schemable
  .nullish(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const pick: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Decoder<unknown, { [P in Keys[number]]: A[P] }> = schemable.pick(
  Schemable
)

/**
 * @since 1.0.0
 */
export const omit: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Decoder<unknown, { [P in Exclude<keyof A, Keys[number]>]: A[P] }> =
  schemable
    .omit(Schemable)
