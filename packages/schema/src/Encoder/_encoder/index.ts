// tracing: off

import * as O from "@effect-ts/core/Option"

import * as S from "../../_schema"

export type Encoder<Output, Encoded> = {
  (u: Output): Encoded
}

const interpreterCache = new WeakMap()
const interpretedCache = new WeakMap()

export const interpreters: ((
  schema: S.SchemaAny
) => O.Option<Encoder<unknown, unknown>>)[] = [
  O.partial((miss) => (schema: S.SchemaAny): Encoder<unknown, unknown> => {
    if (schema instanceof S.SchemaRecursive) {
      if (interpreterCache.has(schema)) {
        return interpreterCache.get(schema)
      }
      const parser = (u: unknown) => {
        if (interpretedCache.has(schema)) {
          return interpretedCache.get(schema)(u)
        }
        const e = encoderFor(schema.self(schema))
        interpretedCache.set(schema, e)
        return e(u)
      }
      interpreterCache.set(schema, parser)
      return parser
    }
    if (schema instanceof S.SchemaIdentity) {
      return (_) => _
    }
    if (schema instanceof S.SchemaCompose) {
      return encoderFor(schema.that)
    }
    if (schema instanceof S.SchemaRefinement) {
      return encoderFor(schema.self)
    }
    if (schema instanceof S.SchemaEncoder) {
      return schema.encoder
    }
    return miss()
  })
]

function encoderFor<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  schema: S.Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
): Encoder<ParsedShape, Encoded> {
  for (const interpreter of interpreters) {
    const _ = interpreter(schema)
    if (_._tag === "Some") {
      return _.value as Encoder<ParsedShape, Encoded>
    }
  }
  if (S.hasContinuation(schema)) {
    return encoderFor(schema[S.SchemaContinuationSymbol]) as Encoder<
      ParsedShape,
      Encoded
    >
  }
  throw new Error(`Missing parser integration for: ${schema.constructor}`)
}

export { encoderFor as for }
