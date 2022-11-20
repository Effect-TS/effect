/**
 * @since 1.0.0
 */

import type { AST } from "@fp-ts/codec/AST"
import * as max_ from "@fp-ts/codec/data/max"
import * as maxLength_ from "@fp-ts/codec/data/maxLength"
import * as min_ from "@fp-ts/codec/data/min"
import * as minLength_ from "@fp-ts/codec/data/minLength"
import * as number_ from "@fp-ts/codec/data/number"
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

/**
 * @since 1.0.0
 */
export interface Guard<in out A> extends Schema<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export interface GuardTypeLambda extends TypeLambda {
  readonly type: Guard<this["Target"]>
}

/**
 * @since 1.0.0
 */
export const make: <A>(
  schema: Schema<A>,
  is: Guard<A>["is"]
) => Guard<A> = I.makeGuard

/**
 * @since 1.0.0
 */
export const unknown: Guard<unknown> = unknown_.Guard

/**
 * @since 1.0.0
 */
export const UnknownArray: Guard<ReadonlyArray<unknown>> = make(
  S.array(S.unknown),
  (u): u is ReadonlyArray<unknown> => Array.isArray(u)
)

/**
 * @since 1.0.0
 */
export const UnknownIndexSignature: Guard<{ readonly [_: string]: unknown }> = make(
  S.indexSignature(S.unknown),
  (u): u is { readonly [_: string]: unknown } =>
    typeof u === "object" && u != null && !Array.isArray(u)
)

/**
 * @since 1.0.0
 */
export const string: Guard<string> = make(
  S.string,
  (u): u is string => typeof u === "string"
)

/**
 * @since 1.0.0
 */
export const minLength: (
  minLength: number
) => <A extends { length: number }>(self: Guard<A>) => Guard<A> = minLength_.guard

/**
 * @since 1.0.0
 */
export const maxLength: (
  maxLength: number
) => <A extends { length: number }>(self: Guard<A>) => Guard<A> = maxLength_.guard

/**
 * @since 1.0.0
 */
export const number: Guard<number> = number_.Guard

/**
 * @since 1.0.0
 */
export const min: (
  min: number
) => <A extends number>(self: Guard<A>) => Guard<A> = min_.guard

/**
 * @since 1.0.0
 */
export const max: (
  max: number
) => <A extends number>(self: Guard<A>) => Guard<A> = max_.guard

/**
 * @since 1.0.0
 */
export const boolean: Guard<boolean> = make(
  S.boolean,
  (u): u is boolean => typeof u === "boolean"
)

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  f: () => Guard<A>
): Guard<A> => {
  const get = S.memoize<void, Guard<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a): a is A => get().is(a)
  )
}

/**
 * @since 1.0.0
 */
export const provideUnsafeGuardFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Guard<A> => {
    const go = (ast: AST): Guard<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(provider)(ast.provider)
          const handler = findHandler(merge, I.GuardId, ast.id)
          if (O.isSome(handler)) {
            if (O.isSome(ast.config)) {
              return handler.value(ast.config.value)(...ast.nodes.map(go))
            }
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Guard interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "String":
          return string
        case "Boolean":
          return boolean
        case "Of":
          return make(S.make(ast), (u): u is any => u === ast.value)
        case "Tuple": {
          const components = ast.components.map(go)
          const oRestElement = pipe(ast.restElement, O.map(go))
          return make(
            S.make(ast),
            (a): a is any => {
              if (UnknownArray.is(a)) {
                if (components.every((guard, i) => guard.is(a[i]))) {
                  if (O.isSome(oRestElement)) {
                    const restElement = oRestElement.value
                    // skip when `ReadonlyArray<unknown>`
                    if (restElement.ast !== S.unknown.ast) {
                      return a.slice(components.length).every(restElement.is)
                    }
                  }
                  return true
                }
              }
              return false
            }
          )
        }
        case "Union": {
          const members = ast.members.map(go)
          return make(
            S.make(ast),
            (a): a is any => members.some((guard) => guard.is(a))
          )
        }
        case "Struct": {
          const fields = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return make(
            S.make(ast),
            (a): a is any => {
              if (!UnknownIndexSignature.is(a)) {
                return false
              }
              for (const key of Object.keys(fields)) {
                if (!fields[key].is(a[key])) {
                  return false
                }
              }
              if (O.isSome(oIndexSignature)) {
                const indexSignature = oIndexSignature.value
                // skip when `{ readonly [_: string]: unknown }`
                if (indexSignature.ast !== S.unknown.ast) {
                  for (const key of Object.keys(a)) {
                    if (!(key in fields) && !indexSignature.is(a[key])) {
                      return false
                    }
                  }
                }
              }
              return true
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
export const unsafeGuardFor: <A>(schema: Schema<A>) => Guard<A> = provideUnsafeGuardFor(empty)

/**
 * @since 1.0.0
 */
export const Schemable: schemable.Schemable<GuardTypeLambda> = {
  fromSchema: unsafeGuardFor
}

/**
 * @since 1.0.0
 */
export const of: <A>(a: A) => Guard<A> = schemable.of(Schemable)

/**
 * @since 1.0.0
 */
export const tuple: <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
) => Guard<{ readonly [K in keyof Components]: S.Infer<Components[K]> }> = schemable
  .tuple(Schemable)

/**
 * @since 1.0.0
 */
export const union: <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Guard<S.Infer<Members[number]>> = schemable
  .union(Schemable)

/**
 * @since 1.0.0
 */
export const struct: <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) => Guard<{ readonly [K in keyof Fields]: S.Infer<Fields[K]> }> = schemable
  .struct(Schemable)

/**
 * @since 1.0.0
 */
export const indexSignature: <A>(value: Schema<A>) => Guard<{
  readonly [_: string]: A
}> = schemable.indexSignature(Schemable)

/**
 * @since 1.0.0
 */
export const array: <A>(item: Schema<A>) => Guard<ReadonlyArray<A>> = schemable
  .array(Schemable)

/**
 * @since 1.0.0
 */
export const nativeEnum: <A extends { [_: string]: string | number }>(
  nativeEnum: A
) => Guard<A> = schemable.nativeEnum(Schemable)

/**
 * @since 1.0.0
 */
export const optional: <A>(self: Schema<A>) => Guard<A | undefined> = schemable
  .optional(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullable: <A>(self: Schema<A>) => Guard<A | null> = schemable
  .nullable(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullish: <A>(self: Schema<A>) => Guard<A | null | undefined> = schemable
  .nullish(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const pick: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Guard<{ [P in Keys[number]]: A[P] }> = schemable.pick(
  Schemable
)

/**
 * @since 1.0.0
 */
export const omit: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Guard<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> = schemable
  .omit(Schemable)
