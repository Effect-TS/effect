/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import type * as dsl from "@fp-ts/codec/DSL"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as T from "@fp-ts/codec/These"

/**
 * @since 1.0.0
 */
export interface Decoder<I, O, E, A> {
  readonly schema: Schema<I, O, E, A>
  readonly decode: (input: I) => T.These<ReadonlyArray<E>, A>
}

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
export const string: Decoder<unknown, string, DE.NotType, string> = {
  schema: S.string,
  decode: (i) => typeof i === "string" ? succeed(i) : fail(DE.notType("string", i))
}

/**
 * @since 1.0.0
 */
export const number: Decoder<unknown, number, DE.NotType, number> = {
  schema: S.number,
  decode: (i) => typeof i === "number" ? succeed(i) : fail(DE.notType("number", i))
}

/**
 * @since 1.0.0
 */
export const boolean: Decoder<unknown, boolean, DE.NotType, boolean> = {
  schema: S.boolean,
  decode: (i) => typeof i === "boolean" ? succeed(i) : fail(DE.notType("boolean", i))
}

const isEqual = <A extends dsl.Literal>(i: unknown, a: A): i is A => i === a

/**
 * @since 1.0.0
 */
export const literal = <A extends dsl.Literal>(
  literal: A
): Decoder<unknown, A, DE.NotEqual<A>, A> => ({
  schema: S.literal(literal),
  decode: (i) => isEqual(i, literal) ? succeed(i) : fail(DE.notEqual(literal, i))
})

/**
 * @since 1.0.0
 */
export const readonlyArray = <I, O, E, A>(
  item: Decoder<I, O, E, A>
): Decoder<ReadonlyArray<I>, ReadonlyArray<A>, E, ReadonlyArray<A>> =>
  decoderFor(S.readonlyArray(item.schema))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Decoder<any, any, any, any>>>(
  fields: Fields
): Decoder<
  { readonly [K in keyof Fields]: Fields[K]["schema"][typeof S.schemaSym][0] },
  { readonly [K in keyof Fields]: Fields[K]["schema"][typeof S.schemaSym][1] },
  Fields[keyof Fields]["schema"][typeof S.schemaSym][2],
  { readonly [K in keyof Fields]: Fields[K]["schema"][typeof S.schemaSym][3] }
> => {
  const keys = Object.keys(fields)
  const schemas: any = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    schemas[key] = fields[key].schema
  }
  return decoderFor(S.struct(schemas)) as any
}

/**
 * @since 1.0.0
 */
export const decoderFor = <I, O, E, A>(schema: Schema<I, O, E, A>): Decoder<I, O, E, A> => {
  return {
    schema,
    decode: decodeFor(schema)
  }
}

const decodeFor = (dsl: dsl.DSL): Decoder<any, any, any, any>["decode"] => {
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
