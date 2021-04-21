// tracing: off

import type * as O from "@effect-ts/core/Option"

import * as S from "../../_schema"

export type Encoder<Output, Encoded> = {
  (u: Output): Encoded
}

export const interpreters: ((
  schema: S.SchemaAny
) => O.Option<Encoder<unknown, unknown>>)[] = []

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
