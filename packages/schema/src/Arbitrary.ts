/**
 * @since 1.0.0
 */

import type { AST } from "@fp-ts/codec/AST"
import * as maxLength_ from "@fp-ts/codec/data/maxLength"
import * as min_ from "@fp-ts/codec/data/min"
import * as minLength_ from "@fp-ts/codec/data/minLength"
import * as unknown_ from "@fp-ts/codec/data/unknown"
import * as I from "@fp-ts/codec/internal/common"
import type { Provider } from "@fp-ts/codec/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as schemable from "@fp-ts/codec/typeclass/Schemable"
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
export const make: <A>(schema: Schema<A>, arbitrary: Arbitrary<A>["arbitrary"]) => Arbitrary<A> =
  I.makeArbitrary

/**
 * @since 1.0.0
 */
export const unknown: Arbitrary<unknown> = unknown_.Arbitrary

/**
 * @since 1.0.0
 */
export const string: Arbitrary<string> = make(S.string, (fc) => fc.string())

/**
 * @since 1.0.0
 */
export const minLength: (
  minLength: number
) => <A extends { length: number }>(self: Arbitrary<A>) => Arbitrary<A> = minLength_.arbitrary

/**
 * @since 1.0.0
 */
export const maxLength: (
  maxLength: number
) => <A extends { length: number }>(self: Arbitrary<A>) => Arbitrary<A> = maxLength_.arbitrary

/**
 * @since 1.0.0
 */
export const number: Arbitrary<number> = make(S.number, (fc) => fc.float())

/**
 * @since 1.0.0
 */
export const min: (
  min: number
) => <A extends number>(self: Arbitrary<A>) => Arbitrary<A> = min_.arbitrary

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
  f: () => Arbitrary<A>
): Arbitrary<A> => {
  const get = S.memoize<void, Arbitrary<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (fc) => get().arbitrary(fc)
  )
}

/**
 * @since 1.0.0
 */
export const provideUnsafeArbitraryFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Arbitrary<A> => {
    const go = (ast: AST): Arbitrary<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(provider)(ast.provider)
          const handler = findHandler(
            merge,
            I.ArbitraryId,
            ast.id
          )
          if (O.isSome(handler)) {
            if (O.isSome(ast.config)) {
              return handler.value(ast.config.value)(...ast.nodes.map(go))
            }
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Arbitrary interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "String":
          return string
        case "Number": {
          let out = number
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
          return lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const unsafeArbitraryFor: <A>(schema: Schema<A>) => Arbitrary<A> = provideUnsafeArbitraryFor(
  empty
)

/**
 * @since 1.0.0
 */
export const Schemable: schemable.Schemable<ArbitraryTypeLambda> = {
  fromSchema: unsafeArbitraryFor
}

/**
 * @since 1.0.0
 */
export const of: <A>(a: A) => Arbitrary<A> = schemable.of(Schemable)

/**
 * @since 1.0.0
 */
export const tuple: <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
) => Arbitrary<{ readonly [K in keyof Components]: S.Infer<Components[K]> }> = schemable
  .tuple(Schemable)

/**
 * @since 1.0.0
 */
export const union: <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Arbitrary<S.Infer<Members[number]>> = schemable
  .union(Schemable)

/**
 * @since 1.0.0
 */
export const struct: <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) => Arbitrary<{ readonly [K in keyof Fields]: S.Infer<Fields[K]> }> = schemable
  .struct(Schemable)

/**
 * @since 1.0.0
 */
export const indexSignature: <A>(value: Schema<A>) => Arbitrary<{
  readonly [_: string]: A
}> = schemable.indexSignature(Schemable)

/**
 * @since 1.0.0
 */
export const array: <A>(item: Schema<A>) => Arbitrary<ReadonlyArray<A>> = schemable
  .array(Schemable)

/**
 * @since 1.0.0
 */
export const nativeEnum: <A extends { [_: string]: string | number }>(
  nativeEnum: A
) => Arbitrary<A> = schemable.nativeEnum(Schemable)

/**
 * @since 1.0.0
 */
export const optional: <A>(self: Schema<A>) => Arbitrary<A | undefined> = schemable
  .optional(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullable: <A>(self: Schema<A>) => Arbitrary<A | null> = schemable
  .nullable(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullish: <A>(self: Schema<A>) => Arbitrary<A | null | undefined> = schemable
  .nullish(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const pick: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Arbitrary<{ [P in Keys[number]]: A[P] }> = schemable.pick(
  Schemable
)

/**
 * @since 1.0.0
 */
export const omit: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Arbitrary<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> = schemable
  .omit(Schemable)
