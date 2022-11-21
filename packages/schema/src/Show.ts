/**
 * @since 1.0.0
 */

import type { AST } from "@fp-ts/codec/AST"
import * as boolean_ from "@fp-ts/codec/data/boolean"
import * as number_ from "@fp-ts/codec/data/number"
import * as string_ from "@fp-ts/codec/data/string"
import * as G from "@fp-ts/codec/Guard"
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
export const ShowId = I.ShowId

/**
 * @since 1.0.0
 */
export interface Show<in out A> extends Schema<A> {
  readonly show: (a: A) => string
}

/**
 * @since 1.0.0
 */
export interface ShowTypeLambda extends TypeLambda {
  readonly type: Show<this["Target"]>
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, show: Show<A>["show"]) => Show<A> = I.makeShow

/**
 * @since 1.0.0
 */
export const string: Show<string> = string_.Show

/**
 * @since 1.0.0
 */
export const number: Show<number> = number_.Show

/**
 * @since 1.0.0
 */
export const boolean: Show<boolean> = boolean_.Show

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  f: () => Show<A>
): Show<A> => {
  const get = S.memoize<void, Show<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().show(a)
  )
}

/**
 * @since 1.0.0
 */
export const provideUnsafeShowFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Show<A> => {
    const go = (ast: AST): Show<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.ShowId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Show interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return make(S.make(ast), (a) => JSON.stringify(a))
        case "Tuple": {
          const components: ReadonlyArray<Show<unknown>> = ast.components.map(go)
          return make(S.make(ast), (tuple: ReadonlyArray<unknown>) =>
            "[" +
            tuple.map((c, i) =>
              i < components.length ?
                components[i].show(c) :
                O.isSome(ast.restElement) ?
                go(ast.restElement.value).show(c) :
                ""
            ).join(
              ","
            ) + "]")
        }
        case "Union": {
          const members = ast.members.map(go)
          const guards = ast.members.map((member) => G.unsafeGuardFor(S.make(member)))
          return make(S.make(ast), (a) => {
            const index = guards.findIndex((Show) => Show.is(a))
            return members[index].show(a)
          })
        }
        case "Struct": {
          const fields: any = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return make(
            S.make(ast),
            (struct: { [_: PropertyKey]: unknown }) => {
              const keys = Object.keys(struct)
              let out = "{"
              for (const key of keys) {
                if (key in fields) {
                  out += `${JSON.stringify(key)}:${fields[key].show(struct[key])},`
                }
              }
              if (O.isSome(oIndexSignature)) {
                const indexSignature = oIndexSignature.value
                for (const key of keys) {
                  if (!(key in fields)) {
                    out += `${JSON.stringify(key)}:${indexSignature.show(struct[key])},`
                  }
                }
              }
              out = out.substring(0, out.length - 1)
              out += "}"
              return out
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
export const unsafeShowFor: <A>(schema: Schema<A>) => Show<A> = provideUnsafeShowFor(empty)

/**
 * @since 1.0.0
 */
export const Schemable: schemable.Schemable<ShowTypeLambda> = {
  fromSchema: unsafeShowFor
}

/**
 * @since 1.0.0
 */
export const of: <A>(a: A) => Show<A> = schemable.of(Schemable)

/**
 * @since 1.0.0
 */
export const tuple: <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
) => Show<{ readonly [K in keyof Components]: S.Infer<Components[K]> }> = schemable
  .tuple(Schemable)

/**
 * @since 1.0.0
 */
export const union: <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Show<S.Infer<Members[number]>> = schemable
  .union(Schemable)

/**
 * @since 1.0.0
 */
export const struct: <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) => Show<{ readonly [K in keyof Fields]: S.Infer<Fields[K]> }> = schemable
  .struct(Schemable)

/**
 * @since 1.0.0
 */
export const indexSignature: <A>(value: Schema<A>) => Show<{
  readonly [_: string]: A
}> = schemable.indexSignature(Schemable)

/**
 * @since 1.0.0
 */
export const array: <A>(item: Schema<A>) => Show<ReadonlyArray<A>> = schemable
  .array(Schemable)

/**
 * @since 1.0.0
 */
export const nativeEnum: <A extends { [_: string]: string | number }>(
  nativeEnum: A
) => Show<A> = schemable.nativeEnum(Schemable)

/**
 * @since 1.0.0
 */
export const optional: <A>(self: Schema<A>) => Show<A | undefined> = schemable
  .optional(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullable: <A>(self: Schema<A>) => Show<A | null> = schemable
  .nullable(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const nullish: <A>(self: Schema<A>) => Show<A | null | undefined> = schemable
  .nullish(
    Schemable
  )

/**
 * @since 1.0.0
 */
export const pick: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Show<{ [P in Keys[number]]: A[P] }> = schemable.pick(
  Schemable
)

/**
 * @since 1.0.0
 */
export const omit: <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) => (self: Schema<A>) => Show<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> = schemable
  .omit(Schemable)
