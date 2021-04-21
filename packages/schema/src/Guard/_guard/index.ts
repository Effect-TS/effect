// tracing: off

import type * as O from "@effect-ts/core/Option"

import type { Schema, SchemaAny } from "../../_schema"
import { hasContinuation, SchemaContinuationSymbol } from "../../_schema"

export type Guard<T> = { (u: unknown): u is T }

export const interpreters: ((schema: SchemaAny) => O.Option<Guard<unknown>>)[] = []

function guardFor<
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
): Guard<ParsedShape> {
  for (const interpreter of interpreters) {
    const _ = interpreter(schema)
    if (_._tag === "Some") {
      return _.value as Guard<ParsedShape>
    }
  }
  if (hasContinuation(schema)) {
    return guardFor(schema[SchemaContinuationSymbol]) as Guard<ParsedShape>
  }
  throw new Error(`Missing guard integration for: ${schema.constructor}`)
}

export { guardFor as for }
