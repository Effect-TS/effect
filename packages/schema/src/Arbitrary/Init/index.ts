// tracing: off

import * as O from "@effect-ts/core/Option"
import type * as fc from "fast-check"

import * as S from "../../_schema"
import * as Arbitrary from "../_arbitrary"

const interpreterCache = new WeakMap()
const interpretedCache = new WeakMap()

Arbitrary.interpreters.push(
  O.partial((miss) => (schema: S.SchemaAny): Arbitrary.Gen<unknown> => {
    if (schema instanceof S.SchemaRecursive) {
      if (interpreterCache.has(schema)) {
        return interpreterCache.get(schema)
      }
      const parser = (_: typeof fc) => {
        if (interpretedCache.has(schema)) {
          return interpretedCache.get(schema)
        }
        const e = Arbitrary.for(schema.self(schema))(_)
        interpretedCache.set(schema, e)
        return e
      }
      interpreterCache.set(schema, parser)
      return parser
    }
    if (schema instanceof S.SchemaIdentity) {
      return (_) => _.anything().filter(schema.guard)
    }
    if (schema instanceof S.SchemaCompose) {
      return Arbitrary.for(schema.that)
    }
    if (schema instanceof S.SchemaArbitrary) {
      return schema.arbitrary
    }
    if (schema instanceof S.SchemaRefinement) {
      const self = Arbitrary.for(schema.self)
      return (_) => self(_).filter(schema.refinement)
    }
    return miss()
  })
)
