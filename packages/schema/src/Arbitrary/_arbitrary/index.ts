// tracing: off

import type * as O from "@effect-ts/core/Option"
import type * as fc from "fast-check"

import type { Schema, SchemaAny } from "../../_schema"
import { hasContinuation, SchemaContinuationSymbol } from "../../_schema"

export type Gen<T> = { (_: typeof fc): fc.Arbitrary<T> }

export const interpreters: ((schema: SchemaAny) => O.Option<Gen<unknown>>)[] = []

function for_<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  schema: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
): Gen<ParsedShape> {
  for (const interpreter of interpreters) {
    const _ = interpreter(schema)
    if (_._tag === "Some") {
      return _.value as Gen<ParsedShape>
    }
  }
  if (hasContinuation(schema)) {
    return for_(schema[SchemaContinuationSymbol]) as Gen<ParsedShape>
  }
  throw new Error(`Missing arbitrary integration for: ${schema.constructor}`)
}

export { for_ as for }
