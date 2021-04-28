// tracing: off

import type { ApiSelfType, Schema } from "../_schema/schema"

export function brand<
  ParsedShape,
  ConstructedShape extends ParsedShape,
  A extends ConstructedShape,
  B extends A
>(_: (_: A) => B) {
  return <ParserInput, ParserError, ConstructorInput, ConstructorError, Encoded, Api>(
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    ParserError,
    B,
    ConstructorInput,
    ConstructorError,
    B,
    Encoded,
    Api & ApiSelfType<B>
  > => self as any
}
