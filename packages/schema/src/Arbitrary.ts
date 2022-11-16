/**
 * @since 1.0.0
 */
import type { Annotations, AST } from "@fp-ts/codec/AST"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as covariantSchema from "@fp-ts/codec/typeclass/CovariantSchema"
import * as ofSchema from "@fp-ts/codec/typeclass/OfSchema"
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
  ({ ast: schema.ast, arbitrary }) as any

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

/**
 * @since 1.0.0
 */
export interface ArbitraryAnnotation {
  readonly _tag: "ArbitraryAnnotation"
  readonly arbitraryFor: (
    annotations: Annotations,
    ...arbs: ReadonlyArray<Arbitrary<any>>
  ) => Arbitrary<any>
}

/**
 * @since 1.0.0
 */
export const isArbitraryAnnotation = (u: unknown): u is ArbitraryAnnotation =>
  u !== null && typeof u === "object" && ("_tag" in u) && (u["_tag"] === "ArbitraryAnnotation")

const go = S.memoize((ast: AST): Arbitrary<any> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotations = ast.annotations.filter(isArbitraryAnnotation)
      if (annotations.length > 0) {
        return annotations[0].arbitraryFor(ast.annotations, ...ast.nodes.map(go))
      }
      throw new Error(`Missing "ArbitraryAnnotation" for ${ast.symbol.description}`)
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
      return make(S.make(ast), (fc) => fc.constant(ast.value))
    case "Tuple": {
      const components = ast.components.map(go)
      const restElement = pipe(ast.restElement, O.map(go))
      if (O.isSome(restElement)) {
        return make(
          S.make(ast),
          (fc) =>
            fc.tuple(...components.map((c) => c.arbitrary(fc))).chain((as) =>
              fc.array(restElement.value.arbitrary(fc)).map((rest) => [...as, ...rest])
            )
        )
      }
      return make(
        S.make(ast),
        (fc) => fc.tuple(...components.map((c) => c.arbitrary(fc)))
      )
    }
    case "Union": {
      const members = ast.members.map(go)
      return make(
        S.make(ast),
        (fc) => fc.oneof(...members.map((c) => c.arbitrary(fc)))
      )
    }
    case "Struct": {
      const fields = ast.fields.map((field) => go(field.value))
      return make(
        S.make(ast),
        (fc) => {
          const arbs: any = {}
          for (let i = 0; i < fields.length; i++) {
            arbs[ast.fields[i].key] = fields[i].arbitrary(fc)
          }
          return fc.record(arbs)
        }
      )
    }
    case "Lazy":
      return lazy(ast.symbol, () => go(ast.f()))
  }
})

/**
 * @since 1.0.0
 */
export const unsafeArbitraryFor = S.memoize(<A>(schema: Schema<A>): Arbitrary<A> => go(schema.ast))

/**
 * @since 1.0.0
 */
export const FromSchema: ofSchema.OfSchema<ArbitraryTypeLambda> = {
  ofSchema: unsafeArbitraryFor
}

/**
 * @since 1.0.0
 */
export const of: <A>(a: A) => Arbitrary<A> = ofSchema.of(FromSchema)

/**
 * @since 1.0.0
 */
export const tuple: <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
) => Arbitrary<{ readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }> = ofSchema
  .tuple(FromSchema)

/**
 * @since 1.0.0
 */
export const union: <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Arbitrary<Parameters<Members[number]["A"]>[0]> = ofSchema
  .union(FromSchema)

/**
 * @since 1.0.0
 */
export const struct: <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) => Arbitrary<{ readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] }> = ofSchema
  .struct(FromSchema)

/**
 * @since 1.0.0
 */
export const indexSignature: <A>(value: Schema<A>) => Arbitrary<{
  readonly [_: string]: A
}> = ofSchema.indexSignature(FromSchema)

/**
 * @since 1.0.0
 */
export const readonlyArray: <A>(item: Schema<A>) => Arbitrary<ReadonlyArray<A>> = ofSchema
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
export const CovariantSchema: covariantSchema.CovariantSchema<ArbitraryTypeLambda> = {
  imapSchema: covariantSchema.imap<ArbitraryTypeLambda>(mapSchema),
  mapSchema
}

/**
 * @since 1.0.0
 */
export const optional: <A>(self: Arbitrary<A>) => Arbitrary<A | undefined> = covariantSchema
  .optional(
    CovariantSchema
  )

/**
 * @since 1.0.0
 */
export const pick: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Arbitrary<A>) => Arbitrary<{ [P in Keys[number]]: A[P] }> = covariantSchema.pick(
  CovariantSchema
)

/**
 * @since 1.0.0
 */
export const omit: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Arbitrary<A>) => Arbitrary<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> =
  covariantSchema
    .omit(CovariantSchema)
