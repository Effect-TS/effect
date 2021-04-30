// tracing: off

import * as O from "@effect-ts/core/Option"

import * as S from "../../_schema"
import * as Guard from "../_guard"

const interpreterCache = new WeakMap()
const interpretedCache = new WeakMap()

Guard.interpreters.push(
  O.partial((miss) => (schema: S.SchemaAny): Guard.Guard<unknown> => {
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
        const e = Guard.for(schema.self(schema))
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
      return Guard.for(schema.that)
    }
    if (schema instanceof S.SchemaRefinement) {
      const self = Guard.for(schema.self)
      return (u): u is unknown => self(u) && schema.refinement(u)
    }
    return miss()
  })
)
