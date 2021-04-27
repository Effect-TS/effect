// tracing: off

import type { Schema } from "../_schema/schema"
import type { LiteralApi } from "./literal"
import type { TaggedApi } from "./tagged"

export type BrandApi<Api, A, B extends A> = [Api] extends [
  LiteralApi<infer KS, infer AS>
]
  ? [B] extends [AS]
    ? LiteralApi<KS, B>
    : Api
  : [Api] extends [TaggedApi<infer Key, infer Props, infer AS>]
  ? [B] extends [AS]
    ? TaggedApi<Key, Props, B>
    : Api
  : Api

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
    BrandApi<Api, A, B>
  > => self as any
}
