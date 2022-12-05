/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as AST from "@fp-ts/schema/AST"
import * as Boolean from "@fp-ts/schema/data/Boolean"
import * as max_ from "@fp-ts/schema/data/filter/max"
import * as maxLength_ from "@fp-ts/schema/data/filter/maxLength"
import * as min_ from "@fp-ts/schema/data/filter/min"
import * as minLength_ from "@fp-ts/schema/data/filter/minLength"
import * as Number from "@fp-ts/schema/data/Number"
import * as String from "@fp-ts/schema/data/String"
import * as Unknown from "@fp-ts/schema/data/Unknown"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"

/**
 * @since 1.0.0
 */
export interface Schema<in out A> {
  readonly A: (_: A) => A
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 */
export type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

/**
 * @since 1.0.0
 */
export const make: <A>(ast: AST.AST) => Schema<A> = I.makeSchema

/**
 * @since 1.0.0
 */
export const declare: <Schemas extends ReadonlyArray<Schema<any>>>(
  id: symbol,
  config: Option<unknown>,
  provider: Provider,
  ...schemas: Schemas
) => Schema<any> = I.declareSchema

/**
 * @since 1.0.0
 */
export const clone = (id: symbol, interpreters: Record<symbol, Function>) =>
  <A>(schema: Schema<A>): Schema<A> => {
    if (AST.isDeclaration(schema.ast)) {
      return I.declareSchema(
        id,
        schema.ast.config,
        P.Semigroup.combine(P.make(id, interpreters))(
          pipe(schema.ast.provider, P.replace(schema.ast.id, id))
        ),
        ...schema.ast.nodes.map(make)
      )
    }
    throw new Error("cannot `clone` non-Declaration schemas")
  }

/**
 * @since 1.0.0
 */
export const unknown: Schema<unknown> = Unknown.Schema

/**
 * @since 1.0.0
 */
export const string: Schema<string> = String.Schema

/**
 * @since 1.0.0
 */
export const minLength: (
  minLength: number
) => <A extends { length: number }>(self: Schema<A>) => Schema<A> = minLength_.schema

/**
 * @since 1.0.0
 */
export const maxLength: (
  maxLength: number
) => <A extends { length: number }>(self: Schema<A>) => Schema<A> = maxLength_.schema

/**
 * @since 1.0.0
 */
export const number: Schema<number> = Number.Schema

/**
 * @since 1.0.0
 */
export const min: (min: number) => <A extends number>(self: Schema<A>) => Schema<A> = min_.schema

/**
 * @since 1.0.0
 */
export const max: (min: number) => <A extends number>(self: Schema<A>) => Schema<A> = max_.schema

/**
 * @since 1.0.0
 */
export const boolean: Schema<boolean> = Boolean.Schema

/**
 * @since 1.0.0
 */
export const of = <A>(value: A): Schema<A> => make(AST.of(value))

/**
 * @since 1.0.0
 */
export const literal = <A extends ReadonlyArray<string | number | boolean | null | undefined>>(
  ...a: A
): Schema<A[number]> => union(...a.map(of))

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(nativeEnum: A): Schema<A> =>
  make(AST.union(
    Object.keys(nativeEnum).filter(
      (key) => typeof nativeEnum[nativeEnum[key]] !== "number"
    ).map((key) => AST.of(nativeEnum[key]))
  ))

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Infer<Members[number]>> => make(AST.union(members.map((m) => m.ast)))

/**
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): Schema<keyof A> => {
  return union(...AST.getFields(schema.ast).map((field) => of(field.key as keyof A)))
}

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
): Schema<{ readonly [K in keyof Components]: Infer<Components[K]> }> =>
  make(AST.tuple(components.map((c) => c.ast), O.none, true))

/**
 * @since 1.0.0
 */
export const withRest = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, ...Array<R>]> => {
    if (AST.isTuple(self.ast)) {
      const a = self.ast
      return make(pipe(
        a.restElement,
        O.match(
          () => AST.tuple(a.components, O.some(rest.ast), true),
          (value) =>
            // if `self` already contains a rest element merge them into a union
            AST.tuple(
              a.components,
              O.some(AST.union([value, rest.ast])),
              true
            )
        )
      ))
    }
    throw new Error("cannot `withRest` non-Tuple schemas")
  }

/**
 * @since 1.0.0
 */
export const array = <A>(item: Schema<A>): Schema<ReadonlyArray<A>> =>
  make(AST.tuple([], O.some(item.ast), true))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <H, T>(
  head: Schema<H>,
  tail: Schema<T>
): Schema<readonly [H, ...Array<T>]> => make(AST.tuple([head.ast], O.some(tail.ast), true))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): Schema<{ readonly [K in keyof Fields]: Infer<Fields[K]> }> =>
  make(
    AST.struct(
      I.getPropertyKeys(fields).map((key) => AST.field(key, fields[key].ast, false, true)),
      O.none,
      O.none
    )
  )

/**
 * @since 1.0.0
 */
export const extend = <B>(
  that: Schema<B>
) =>
  <A>(self: Schema<A>): Schema<A & B> => {
    if (AST.isStruct(self.ast) && AST.isStruct(that.ast)) {
      const a = AST.getStringIndexSignature(self.ast)
      const b = AST.getSymbolIndexSignature(self.ast)
      const c = AST.getStringIndexSignature(that.ast)
      const d = AST.getSymbolIndexSignature(that.ast)
      if ((O.isSome(a) && O.isSome(b)) || O.isSome(c) && O.isSome(d)) {
        throw new Error("cannot `extend` double index signatures")
      }
      const struct = AST.struct(
        AST.getFields(self.ast).concat(AST.getFields(that.ast)),
        pipe(a, O.orElse(c)),
        pipe(b, O.orElse(d))
      )
      return make(struct)
    }
    throw new Error("cannot `extend` non-Struct schemas")
  }

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (schema: Schema<A>): Schema<{ readonly [P in Keys[number]]: A[P] }> => {
    return make(AST.struct(
      AST.getFields(schema.ast).filter((f) => (keys as ReadonlyArray<PropertyKey>).includes(f.key)),
      O.none,
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (schema: Schema<A>): Schema<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> => {
    return make(AST.struct(
      AST.getFields(schema.ast).filter((f) =>
        !(keys as ReadonlyArray<PropertyKey>).includes(f.key)
      ),
      O.none,
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const partial = <A>(schema: Schema<A>): Schema<Partial<A>> => {
  if (AST.isStruct(schema.ast)) {
    return make(
      AST.struct(
        schema.ast.fields.map((f) => AST.field(f.key, f.value, true, f.readonly)),
        schema.ast.stringIndexSignature,
        schema.ast.symbolIndexSignature
      )
    )
  }
  throw new Error("cannot `partial` non-Struct schemas")
}

/**
 * @since 1.0.0
 */
export const stringIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [_: string]: A }> =>
  make(AST.struct([], O.some(AST.indexSignature(value.ast, true)), O.none))

/**
 * @since 1.0.0
 */
export const symbolIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [_: symbol]: A }> =>
  make(AST.struct([], O.none, O.some(AST.indexSignature(value.ast, true))))

/**
 * @since 1.0.0
 */
export const lazy = <A>(f: () => Schema<A>): Schema<A> => {
  return make(AST.lazy(() => f().ast))
}
