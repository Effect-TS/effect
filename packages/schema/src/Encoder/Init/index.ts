// tracing: off

import * as O from "@effect-ts/core/Option"

import * as S from "../../_schema"
import * as Encoder from "../_encoder"

const interpreterCache = new WeakMap()
const interpretedCache = new WeakMap()

Encoder.interpreters.push(
  O.partial((miss) => (schema: S.SchemaAny): Encoder.Encoder<unknown, unknown> => {
    if (schema instanceof S.SchemaRecursive) {
      if (interpreterCache.has(schema)) {
        return interpreterCache.get(schema)
      }
      const parser = (u: unknown) => {
        if (interpretedCache.has(schema)) {
          return interpretedCache.get(schema)(u)
        }
        const e = Encoder.for(schema.self(schema))
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
      return Encoder.for(schema.that)
    }
    if (schema instanceof S.SchemaRefinement) {
      return Encoder.for(schema.self)
    }
    if (schema instanceof S.SchemaEncoder) {
      return schema.encoder
    }
    return miss()
  })
)
