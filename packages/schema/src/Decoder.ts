/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import type * as dsl from "@fp-ts/codec/DSL"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as T from "@fp-ts/codec/These"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export interface Decoder<I, E, A> {
  readonly schema: Schema<A>
  readonly decode: (input: I) => T.These<ReadonlyArray<E>, A>
}

export type InputOf<D> = D extends Decoder<infer I, any, any> ? I : never
export type ErrorOf<D> = D extends Decoder<any, infer E, any> ? E : never
export type TypeOf<D> = D extends Decoder<any, any, infer A> ? A : never

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
export const string: Decoder<unknown, DE.NotType, string> = {
  schema: S.string,
  decode: (i) => typeof i === "string" ? succeed(i) : fail(DE.notType("string", i))
}

/**
 * @since 1.0.0
 */
export const number: Decoder<unknown, DE.NotType, number> = {
  schema: S.number,
  decode: (i) => typeof i === "number" ? succeed(i) : fail(DE.notType("number", i))
}

/**
 * @since 1.0.0
 */
export const boolean: Decoder<unknown, DE.NotType, boolean> = {
  schema: S.boolean,
  decode: (i) => typeof i === "boolean" ? succeed(i) : fail(DE.notType("boolean", i))
}

const isEqual = <A extends dsl.Literal>(i: unknown, a: A): i is A => i === a

/**
 * @since 1.0.0
 */
export const literal = <A extends dsl.Literal>(
  literal: A
): Decoder<unknown, DE.NotEqual<A>, A> => ({
  schema: S.literal(literal),
  decode: (i) => isEqual(i, literal) ? succeed(i) : fail(DE.notEqual(literal, i))
})

/**
 * @since 1.0.0
 */
export const fromGenericArray = <I, E, A, B extends boolean>(
  item: Decoder<I, E, A>,
  readonly: B
): Decoder<
  B extends true ? ReadonlyArray<I> : Array<I>,
  E,
  B extends true ? ReadonlyArray<A> : Array<A>
> => ({
  schema: S.array(item.schema, readonly),
  decode: (is) => {
    const es: Array<E> = []
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
  }
})

/**
 * @since 1.0.0
 */
export const fromReadonlyArray = <I, E, A>(
  item: Decoder<I, E, A>
) => fromGenericArray(item, true)

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Decoder<any, any, any>>>(
  fields: Fields
): Decoder<
  { readonly [K in keyof Fields]: InputOf<Fields[K]> },
  { readonly [K in keyof Fields]: ErrorOf<Fields[K]> }[keyof Fields],
  { readonly [K in keyof Fields]: TypeOf<Fields[K]> }
> => {
  const keys = Object.keys(fields)
  const schemas: any = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    schemas[key] = fields[key].schema
  }
  return {
    schema: decoderFor(S.struct(schemas)),
    decode: (input: { [_: string]: unknown }) => {
      const a = {}
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const t = fields[key].decode(input[key])
        if (T.isLeft(t)) {
          return T.left(t.left)
        }
        a[key] = t.right
      }
      return succeed(a)
    }
  } as any
}

/**
 * @since 1.0.0
 */
export const decoderFor = <I, E, A>(schema: Schema<A>): Decoder<I, E, A> => {
  return {
    schema,
    decode: decodeFor(schema)
  }
}

const decodeFor = (dsl: dsl.DSL): Decoder<any, any, any>["decode"] => {
  switch (dsl._tag) {
    case "StringDSL":
      return string.decode
    case "NumberDSL":
      return number.decode
    case "BooleanDSL":
      return boolean.decode
    case "LiteralDSL":
      return literal(dsl.literal).decode
    case "ArrayDSL": {
      const decode = decodeFor(dsl.item)
      return (input) => {
        const a = []
        for (const i of input) {
          const t = decode(i)
          if (T.isLeft(t)) {
            return T.left(t.left)
          }
          a.push(t.right)
        }
        return succeed(a)
      }
    }
    case "StructDSL": {
      const decodes = dsl.fields.map((f) => decodeFor(f.value))
      return (input) => {
        const a = {}
        for (let i = 0; i < decodes.length; i++) {
          const key = dsl.fields[i].key
          const t = decodes[i](input[key])
          if (T.isLeft(t)) {
            return T.left(t.left)
          }
          a[key] = t.right
        }
        return succeed(a)
      }
    }
  }
  console.log(dsl._tag)
  throw new Error(dsl._tag)
}
