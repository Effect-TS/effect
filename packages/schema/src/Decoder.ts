/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import type { AST } from "@fp-ts/schema/AST"
import * as UnknownArray from "@fp-ts/schema/data/UnknownArray"
import * as UnknownObject from "@fp-ts/schema/data/UnknownObject"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const DecoderId = I.DecoderId

/**
 * @since 1.0.0
 */
export interface Decoder<in S, in out A> extends Schema<A> {
  readonly I: (_: S) => void
  readonly decode: (i: S) => T.These<ReadonlyArray<DE.DecodeError>, A>
}

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, decode: Decoder<S, A>["decode"]) => Decoder<S, A> =
  I.makeDecoder

/**
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => T.These<never, A> = I.succeed

/**
 * @since 1.0.0
 */
export const fail: <E>(e: E) => T.These<ReadonlyArray<E>, never> = I.fail

/**
 * @since 1.0.0
 */
export const warn: <E, A>(e: E, a: A) => T.These<ReadonlyArray<E>, A> = I.warn

/**
 * @since 1.0.0
 */
export const flatMap: <A, E2, B>(
  f: (a: A) => T.These<ReadonlyArray<E2>, B>
) => <E1>(self: T.These<ReadonlyArray<E1>, A>) => T.These<ReadonlyArray<E1 | E2>, B> = I.flatMap

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
        if (T.isLeft(t)) {
          return T.left(t.left)
        }
        out[i] = t.right // TODO: handle warnings
      }
      return succeed(out)
    }
  )

/**
 * @since 1.0.0
 */
export const fromArray = <S, A>(
  item: Decoder<S, A>
): Decoder<ReadonlyArray<S>, ReadonlyArray<A>> =>
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
    return T.right(as)
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
      if (T.isLeft(t)) {
        return t
      }
      a[key] = t.right // TODO handle both
    }
    return succeed(a)
  })
}

/**
 * @since 1.0.0
 */
export const fromIndexSignature = <S, A>(
  value: Decoder<S, A>
): Decoder<{ readonly [_: string]: S }, { readonly [_: string]: A }> =>
  make(S.indexSignature(value), (ri) => {
    const out: any = {}
    for (const key of Object.keys(ri)) {
      const t = value.decode(ri[key])
      if (T.isLeft(t)) {
        return t
      }
      out[key] = t.right
    }
    return succeed(out)
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

/**
 * @since 1.0.0
 */
export const provideDecoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Decoder<any, A> => {
    const go = (ast: AST): Decoder<any, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.DecoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Decoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return make(
            S.make(ast),
            (u) => u === ast.value ? succeed(u) : fail(DE.notEqual(ast.value, u))
          )
        case "Tuple": {
          const decoder = fromTuple(...ast.components.map(go))
          const oRestElement = pipe(ast.restElement, O.map(go))
          return pipe(
            UnknownArray.Decoder,
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
            UnknownObject.Decoder,
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
export const decoderFor: <A>(schema: Schema<A>) => Decoder<unknown, A> = provideDecoderFor(empty)
