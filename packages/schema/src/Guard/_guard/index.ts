// tracing: off

import * as O from "@effect-ts/core/Option"

import * as S from "../../_schema"
import { hasContinuation, SchemaContinuationSymbol } from "../../_schema"

export type Guard<T> = { (u: unknown): u is T }

const interpreterCache = new WeakMap()
const interpretedCache = new WeakMap()

export const interpreters: ((schema: S.SchemaAny) => O.Option<Guard<unknown>>)[] = [
  O.partial((miss) => (schema: S.SchemaAny): Guard<unknown> => {
    if (schema instanceof S.SchemaGuard) {
      return schema.guard
    }
    if (schema instanceof S.SchemaRecursive) {
      if (interpreterCache.has(schema)) {
        return interpreterCache.get(schema)
      }
      const parser = (u: unknown): u is unknown => {
        if (interpretedCache.has(schema)) {
          return interpretedCache.get(schema)(u)
        }
        const e = guardFor(schema.self(schema))
        interpretedCache.set(schema, e)
        return e(u)
      }
      interpreterCache.set(schema, parser)
      return parser
    }
    if (schema instanceof S.SchemaIdentity) {
      return schema.guard
    }
    if (schema instanceof S.SchemaCompose) {
      return guardFor(schema.that)
    }
    if (schema instanceof S.SchemaRefinement) {
      const self = guardFor(schema.self)
      return (u): u is unknown => self(u) && schema.refinement(u)
    }
    return miss()
  })
]

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
