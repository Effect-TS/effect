/**
 * @since 1.0.0
 */
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as O from "@fp-ts/data/Option"
import type * as FastCheck from "fast-check"

/**
 * @since 1.0.0
 */
export interface Arbitrary<in out A> extends S.Schema<A> {
  readonly arbitrary: (fc: typeof FastCheck) => FastCheck.Arbitrary<A>
}

/**
 * @since 1.0.0
 */
export const make = <A>(schema: Schema<A>, arbitrary: Arbitrary<A>["arbitrary"]): Arbitrary<A> =>
  ({ meta: schema.meta, arbitrary }) as any

/**
 * @since 1.0.0
 */
export const never: Arbitrary<never> = make(S.never, () => {
  throw new Error("never")
})

/**
 * @since 1.0.0
 */
export const unknown: Arbitrary<unknown> = make(S.unknown, (fc) => fc.anything())

/**
 * @since 1.0.0
 */
export const any: Arbitrary<any> = make(S.any, (fc) => fc.anything())

/**
 * @since 1.0.0
 */
export const string: Arbitrary<string> = make(S.string, (fc) => fc.string())

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(self: Arbitrary<A>): Arbitrary<A> =>
    make(
      S.minLength(minLength)(self),
      (fc) => self.arbitrary(fc).filter((a) => a.length >= minLength)
    )

/**
 * @since 1.0.0
 */
export const maxLength = (
  maxLength: number
) =>
  <A extends { length: number }>(self: Arbitrary<A>): Arbitrary<A> =>
    make(
      S.maxLength(maxLength)(self),
      (fc) => self.arbitrary(fc).filter((a) => a.length <= maxLength)
    )

/**
 * @since 1.0.0
 */
export const number: Arbitrary<number> = make(S.number, (fc) => fc.float())

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <A extends number>(self: Arbitrary<A>): Arbitrary<A> =>
    make(
      S.minimum(minimum)(self),
      (fc) => self.arbitrary(fc).filter((a) => a >= minimum)
    )

/**
 * @since 1.0.0
 */
export const maximum = (
  maximum: number
) =>
  <A extends number>(self: Arbitrary<A>): Arbitrary<A> =>
    make(
      S.maximum(maximum)(self),
      (fc) => self.arbitrary(fc).filter((a) => a <= maximum)
    )

/**
 * @since 1.0.0
 */
export const boolean: Arbitrary<boolean> = make(S.boolean, (fc) => fc.boolean())

/**
 * @since 1.0.0
 */
export const of = <A>(
  value: A
): Arbitrary<A> => make(S.of(value), (fc) => fc.constant(value))

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Arbitrary<unknown>>>(
  ...components: Components
): Arbitrary<{ readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }> =>
  make(
    S.tuple<true, Components>(true, ...components),
    (fc) => fc.tuple<any>(...components.map((c) => c.arbitrary(fc)))
  )

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Arbitrary<unknown>>>(
  ...members: Members
): Arbitrary<Parameters<Members[number]["A"]>[0]> =>
  make(
    S.union<Members>(...members),
    (fc) => fc.oneof(...members.map((c) => c.arbitrary(fc)))
  )

/**
 * @since 1.0.0
 */
export const mapSchema = <A, B>(
  f: (schema: Schema<A>) => Schema<B>
) => (arb: Arbitrary<A>): Arbitrary<B> => unsafeArbitraryFor(f(arb))

/**
 * @since 1.0.0
 */
export const optional = mapSchema(S.optional)

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Arbitrary<unknown>>>(
  fields: Fields
): Arbitrary<{ readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] }> =>
  make(
    S.struct(fields),
    (fc) => {
      const arbs: any = {}
      Object.keys(fields).forEach((key) => {
        arbs[key] = fields[key].arbitrary(fc)
      })
      return fc.record(arbs)
    }
  )

/**
 * @since 1.0.0
 */
export const indexSignature = <A>(
  value: Arbitrary<A>
): Arbitrary<{ readonly [_: string]: A }> =>
  make(
    S.indexSignature(value),
    (fc) => fc.dictionary(fc.string(), value.arbitrary(fc))
  )

/**
 * @since 1.0.0
 */
export const array = <A>(
  item: Arbitrary<A>
): Arbitrary<ReadonlyArray<A>> =>
  make(
    S.array(true, item),
    (fc) => fc.array(item.arbitrary(fc))
  )

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  symbol: symbol,
  f: () => Arbitrary<A>
): Arbitrary<A> => {
  const get = S.memoize<void, Arbitrary<A>>(f)
  const schema = S.lazy(symbol, f)
  return make(
    schema,
    (fc) => get().arbitrary(fc)
  )
}

/**
 * @since 1.0.0
 */
export const unsafeArbitraryFor = <A>(schema: Schema<A>): Arbitrary<A> => {
  const f = (meta: Meta): Arbitrary<any> => {
    switch (meta._tag) {
      case "Apply": {
        const declaration = meta.declaration
        if (declaration.arbitraryFor != null) {
          return O.isSome(meta.config) ?
            declaration.arbitraryFor(meta.config.value, ...meta.metas.map(f)) :
            declaration.arbitraryFor(...meta.metas.map(f))
        }
        throw new Error(`Missing "arbitraryFor" declaration for ${meta.symbol.description}`)
      }
      case "Never":
        return never as any
      case "Unknown":
        return unknown
      case "Any":
        return any
      case "String": {
        let out = string
        if (meta.minLength !== undefined) {
          out = minLength(meta.minLength)(out)
        }
        if (meta.maxLength !== undefined) {
          out = maxLength(meta.maxLength)(out)
        }
        return out
      }
      case "Number": {
        let out = number
        if (meta.minimum !== undefined) {
          out = minimum(meta.minimum)(out)
        }
        if (meta.maximum !== undefined) {
          out = maximum(meta.maximum)(out)
        }
        return out
      }
      case "Boolean":
        return boolean
      case "Of":
        return of(meta.value)
      case "Tuple": {
        const components = meta.components.map(f)
        const out = tuple(...components)
        if (O.isSome(meta.restElement)) {
          const restElement = f(meta.restElement.value)
          return make(
            S.make(meta),
            (fc) =>
              out.arbitrary(fc).chain((as) =>
                fc.array(restElement.arbitrary(fc)).map((rest) => [...as, ...rest])
              )
          )
        }
        return out
      }
      case "Union":
        return union(...meta.members.map(f))
      case "Struct": {
        const fields = {}
        meta.fields.forEach((field) => {
          fields[field.key] = f(field.value)
        })
        return struct(fields)
      }
      case "IndexSignature":
        return indexSignature(f(meta.value))
      case "Array":
        return array(f(meta.item))
      case "Lazy":
        return lazy(meta.symbol, () => f(meta.f()))
    }
  }
  return f(schema.meta)
}
