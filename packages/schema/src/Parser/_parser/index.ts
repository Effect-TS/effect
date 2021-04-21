// tracing: off

import type * as O from "@effect-ts/core/Option"

import type { Schema, SchemaAny } from "../../_schema"
import { hasContinuation, SchemaContinuationSymbol } from "../../_schema"
import type * as T from "../../These"

export type Parser<I, E, A> = {
  (u: I): T.These<E, A>
}

export const interpreters: ((
  schema: SchemaAny
) => O.Option<Parser<unknown, unknown, unknown>>)[] = []

function parserFor<
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
): Parser<ParserInput, ParserError, ParsedShape> {
  for (const interpreter of interpreters) {
    const _ = interpreter(schema)
    if (_._tag === "Some") {
      return _.value as Parser<ParserInput, ParserError, ParsedShape>
    }
  }
  if (hasContinuation(schema)) {
    return parserFor(schema[SchemaContinuationSymbol]) as Parser<
      ParserInput,
      ParserError,
      ParsedShape
    >
  }
  throw new Error(`Missing parser integration for: ${schema.constructor}`)
}

export { parserFor as for }
