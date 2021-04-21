// tracing: off

import type * as O from "@effect-ts/core/Option"

import type { Schema, SchemaAny } from "../../_schema"
import { hasContinuation, SchemaContinuationSymbol } from "../../_schema"
import type * as Th from "../../These"

export type Constructor<Input, Output, ConstructorError> = {
  (u: Input): Th.These<ConstructorError, Output>
}

export const interpreters: ((
  schema: SchemaAny
) => O.Option<Constructor<unknown, unknown, unknown>>)[] = []

function constructorFor<
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
): Constructor<ConstructorInput, ConstructedShape, ConstructorError> {
  for (const interpreter of interpreters) {
    const _ = interpreter(schema)
    if (_._tag === "Some") {
      return _.value as Constructor<
        ConstructorInput,
        ConstructedShape,
        ConstructorError
      >
    }
  }
  if (hasContinuation(schema)) {
    return constructorFor(schema[SchemaContinuationSymbol]) as Constructor<
      ConstructorInput,
      ConstructedShape,
      ConstructorError
    >
  }
  throw new Error(`Missing guard integration for: ${JSON.stringify(schema)}`)
}

export { constructorFor as for }
