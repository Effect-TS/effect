/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import * as ast from "@fp-ts/schema/AST"
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
  readonly ast: AST
}

/**
 * @since 1.0.0
 */
export type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

/**
 * @since 1.0.0
 */
export const make: <A>(ast: AST) => Schema<A> = I.makeSchema

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
    if (ast.isDeclaration(schema.ast)) {
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
export const of = <A>(value: A): Schema<A> => make(ast.of(value))

/**
 * @since 1.0.0
 */
export const literal = <A extends ReadonlyArray<string | number | boolean | null | undefined>>(
  ...a: A
): Schema<A[number]> => union(...a.map(of))

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Infer<Members[number]>> => make(ast.union(members.map((m) => m.ast)))

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(nativeEnum: A): Schema<A> =>
  make(ast.union(
    Object.keys(nativeEnum).filter(
      (key) => typeof nativeEnum[nativeEnum[key]] !== "number"
    ).map((key) => ast.of(nativeEnum[key]))
  ))

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
): Schema<{ readonly [K in keyof Components]: Infer<Components[K]> }> =>
  make(ast.tuple(components.map((c) => c.ast), O.none, true))

/**
 * @since 1.0.0
 */
export const withRest = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, ...Array<R>]> => {
    if (ast.isTuple(self.ast)) {
      const a = self.ast
      return make(pipe(
        a.restElement,
        O.match(
          () => ast.tuple(a.components, O.some(rest.ast), true),
          (value) =>
            // if `self` already contains a rest element merge them into a union
            ast.tuple(
              a.components,
              O.some(ast.union([value, rest.ast])),
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
export const nonEmptyArray = <H, T>(
  head: Schema<H>,
  tail: Schema<T>
): Schema<readonly [H, ...Array<T>]> => make(ast.tuple([head.ast], O.some(tail.ast), true))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): Schema<{ readonly [K in keyof Fields]: Infer<Fields[K]> }> =>
  make(
    ast.struct(
      I.getPropertyKeys(fields).map((key) => ast.field(key, fields[key].ast, false, true)),
      O.none
    )
  )

/**
 * @since 1.0.0
 */
export const stringIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [_: string]: A }> =>
  make(ast.struct([], O.some(ast.indexSignature(value.ast, true))))

/**
 * @since 1.0.0
 */
export const withStringIndexSignature = <V>(value: Schema<V>) =>
  <A>(
    self: Schema<A>
  ): Schema<A & { readonly [_: string]: V }> => {
    if (ast.isStruct(self.ast)) {
      const a = self.ast
      if (O.isSome(a.stringIndexSignature)) {
        throw new Error("cannot double apply `withStringIndexSignature`")
      }
      return make(ast.struct(a.fields, O.some(ast.indexSignature(value.ast, true))))
    }
    throw new Error("cannot `withStringIndexSignature` non-Struct schemas")
  }

/**
 * @since 1.0.0
 */
export const array = <A>(item: Schema<A>): Schema<ReadonlyArray<A>> =>
  make(ast.tuple([], O.some(item.ast), true))

/** @internal */
export const memoize = <A, B>(f: (a: A) => B, trace = false): (a: A) => B => {
  const cache = new Map()
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a)
      cache.set(a, b)
      return b
    } else if (trace) {
      console.log("cache hit, key: ", a, ", value: ", cache.get(a))
    }
    return cache.get(a)
  }
}

/**
 * @since 1.0.0
 */
export const lazy = <A>(f: () => Schema<A>): Schema<A> => {
  return make(ast.lazy(() => f().ast))
}

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (schema: Schema<A>): Schema<{ [P in Keys[number]]: A[P] }> => {
    return make(ast.struct(
      ast.getFields(schema.ast).filter((f) => (keys as ReadonlyArray<PropertyKey>).includes(f.key)),
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): Schema<keyof A> => {
  return union(...ast.getFields(schema.ast).map((field) => of(field.key as keyof A)))
}

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (schema: Schema<A>): Schema<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> => {
    return make(ast.struct(
      ast.getFields(schema.ast).filter((f) =>
        !(keys as ReadonlyArray<PropertyKey>).includes(f.key)
      ),
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const partial = <A>(schema: Schema<A>): Schema<Partial<A>> => {
  if (ast.isStruct(schema.ast)) {
    return make(
      ast.struct(
        schema.ast.fields.map((f) => ast.field(f.key, f.value, true, f.readonly)),
        schema.ast.stringIndexSignature
      )
    )
  }
  throw new Error("cannot `partial` non-Struct schemas")
}

// /**
//  * @since 1.0.0
//  */
// export const optional = <A>(schema: Schema<A>): Schema<A | undefined> =>
//   union(of(undefined), schema)

// /**
//  * @since 1.0.0
//  */
// export const nullable = <A>(schema: Schema<A>): Schema<A | null> => union(of(null), schema)

// /**
//  * @since 1.0.0
//  */
// export const nullish = <A>(schema: Schema<A>): Schema<A | null | undefined> =>
//   union(of(null), of(undefined), schema)

// /**
//  * @since 1.0.0
//  */
// export const required = <A>(schema: Schema<A>): Schema<{ [P in keyof A]-?: A[P] }> => {
//   if (ast.isStruct(schema.ast)) {
//     return make(
//       ast.struct(
//         schema.ast.fields.map((f) => ast.field(f.key, f.value, false, f.readonly)),
//         schema.ast.stringIndexSignature
//       )
//     )
//   }
//   throw new Error("cannot `required` non-Struct schemas")
// }

// /**
//  * @since 1.0.0
//  */
// export const option = <A>(value: Schema<A>): Schema<Option<A>> =>
//   union(
//     struct({ _tag: of("None" as const) }),
//     struct({ _tag: of("Some" as const), value })
//   )

// /**
//  * @since 1.0.0
//  */
// export const either = <E, A>(left: Schema<E>, right: Schema<A>): Schema<Either<E, A>> =>
//   union(
//     struct({ _tag: of("Left" as const), left }),
//     struct({ _tag: of("Right" as const), right })
//   )

/*
type OptionalKeys<A> = {
  [K in keyof A]: K extends `${string}?` ? K : never
}[keyof A]

type RequiredKeys<A> = {
  [K in keyof A]: K extends `${string}?` ? never : K
}[keyof A]

 export const crazyStruct = <Fields extends Record<PropertyKey, Schema<unknown>>>(
  fields: Fields
): Schema<
  & { readonly [K in OptionalKeys<Fields> as K extends `${infer S}?` ? S : K]+?: Infer<Fields[K]> }
  & { readonly [K in RequiredKeys<Fields>]: Infer<Fields[K]> }
> =>
  make(
    ast.struct(
      Object.keys(fields).map((key) => {
        const isOptional = key.endsWith("?")
        return ast.field(
          isOptional ? key.substring(0, key.length - 1) : key,
          fields[key],
          isOptional,
          true
        )
      })
    )
  )
*/
