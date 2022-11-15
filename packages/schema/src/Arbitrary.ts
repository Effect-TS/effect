/**
 * @since 1.0.0
 */
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as fromSchema from "@fp-ts/codec/typeclass/FromSchema"
import * as schemableFunctor from "@fp-ts/codec/typeclass/SchemableFunctor"
import type { TypeLambda } from "@fp-ts/core/HKT"
import { pipe } from "@fp-ts/data/Function"
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
export interface ArbitraryTypeLambda extends TypeLambda {
  readonly type: Arbitrary<this["Target"]>
}

/**
 * @since 1.0.0
 */
export const make = <A>(schema: Schema<A>, arbitrary: Arbitrary<A>["arbitrary"]): Arbitrary<A> =>
  ({ meta: schema.meta, arbitrary }) as any

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

const go = S.memoize((meta: Meta): Arbitrary<any> => {
  switch (meta._tag) {
    case "Apply": {
      const declaration = meta.declaration
      if (declaration.arbitraryFor != null) {
        return O.isSome(meta.config) ?
          declaration.arbitraryFor(meta.config.value, ...meta.metas.map(go)) :
          declaration.arbitraryFor(...meta.metas.map(go))
      }
      throw new Error(`Missing "arbitraryFor" declaration for ${meta.symbol.description}`)
    }
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
      return make(S.make(meta), (fc) => fc.constant(meta.value))
    case "Tuple": {
      const components = meta.components.map(go)
      const restElement = pipe(meta.restElement, O.map(go))
      if (O.isSome(restElement)) {
        return make(
          S.make(meta),
          (fc) =>
            fc.tuple(...components.map((c) => c.arbitrary(fc))).chain((as) =>
              fc.array(restElement.value.arbitrary(fc)).map((rest) => [...as, ...rest])
            )
        )
      }
      return make(
        S.make(meta),
        (fc) => fc.tuple(...components.map((c) => c.arbitrary(fc)))
      )
    }
    case "Union": {
      const members = meta.members.map(go)
      return make(
        S.make(meta),
        (fc) => fc.oneof(...members.map((c) => c.arbitrary(fc)))
      )
    }
    case "Struct": {
      const fields = meta.fields.map((field) => go(field.value))
      return make(
        S.make(meta),
        (fc) => {
          const arbs: any = {}
          for (let i = 0; i < fields.length; i++) {
            arbs[meta.fields[i].key] = fields[i].arbitrary(fc)
          }
          return fc.record(arbs)
        }
      )
    }
    case "IndexSignature": {
      const value = go(meta.value)
      return make(
        S.make(meta),
        (fc) => fc.dictionary(fc.string(), value.arbitrary(fc))
      )
    }
    case "Array": {
      const item = go(meta.item)
      return make(
        S.make(meta),
        (fc) => fc.array(item.arbitrary(fc))
      )
    }
    case "Lazy":
      return lazy(meta.symbol, () => go(meta.f()))
  }
})

/**
 * @since 1.0.0
 */
export const unsafeArbitraryFor = S.memoize(<A>(schema: Schema<A>): Arbitrary<A> => go(schema.meta))

/**
 * @since 1.0.0
 */
export const FromSchema: fromSchema.FromSchema<ArbitraryTypeLambda> = {
  fromSchema: unsafeArbitraryFor
}

/**
 * @since 1.0.0
 */
export const of: <A>(a: A) => Arbitrary<A> = fromSchema.of(FromSchema)

/**
 * @since 1.0.0
 */
export const tuple: <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
) => Arbitrary<{ readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }> = fromSchema
  .tuple(FromSchema)

/**
 * @since 1.0.0
 */
export const union: <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Arbitrary<Parameters<Members[number]["A"]>[0]> = fromSchema
  .union(FromSchema)

/**
 * @since 1.0.0
 */
export const struct: <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) => Arbitrary<{ readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] }> = fromSchema
  .struct(FromSchema)

/**
 * @since 1.0.0
 */
export const indexSignature: <A>(value: Schema<A>) => Arbitrary<{
  readonly [_: string]: A
}> = fromSchema.indexSignature(FromSchema)

/**
 * @since 1.0.0
 */
export const readonlyArray: <A>(item: Schema<A>) => Arbitrary<ReadonlyArray<A>> = fromSchema
  .readonlyArray(FromSchema)

/**
 * @since 1.0.0
 */
export const mapSchema = <A, B>(
  f: (schema: Schema<A>) => Schema<B>
) => (arb: Arbitrary<A>): Arbitrary<B> => unsafeArbitraryFor(f(arb))

/**
 * @since 1.0.0
 */
export const SchemableFunctor: schemableFunctor.SchemableFunctor<ArbitraryTypeLambda> = {
  mapSchema
}

/**
 * @since 1.0.0
 */
export const optional: <A>(self: Arbitrary<A>) => Arbitrary<A | undefined> = schemableFunctor
  .optional(
    SchemableFunctor
  )

/**
 * @since 1.0.0
 */
export const pick: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Arbitrary<A>) => Arbitrary<{ [P in Keys[number]]: A[P] }> = schemableFunctor.pick(
  SchemableFunctor
)

/**
 * @since 1.0.0
 */
export const omit: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Arbitrary<A>) => Arbitrary<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> =
  schemableFunctor
    .omit(SchemableFunctor)
