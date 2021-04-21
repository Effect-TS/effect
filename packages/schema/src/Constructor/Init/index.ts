// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import * as O from "@effect-ts/core/Option"

import * as S from "../../_schema"
import * as Th from "../../These"
import * as Constructor from "../_constructor"

const interpreterCache = new WeakMap()
const interpretedCache = new WeakMap()

Constructor.interpreters.push(
  O.partial((miss) => (schema: S.SchemaAny): Constructor.Constructor<
    unknown,
    unknown,
    unknown
  > => {
    if (schema instanceof S.SchemaRecursive) {
      if (interpreterCache.has(schema)) {
        return interpreterCache.get(schema)
      }
      const parser = (u: unknown) => {
        if (interpretedCache.has(schema)) {
          return interpretedCache.get(schema)(u)
        }
        const e = Constructor.for(schema.self(schema))
        interpretedCache.set(schema, e)
        return e(u)
      }
      interpreterCache.set(schema, parser)
      return parser
    }
    if (schema instanceof S.SchemaNamed) {
      const self = Constructor.for(schema.self)
      return (u) => Th.mapError_(self(u), (e) => S.namedE(schema.name, e))
    }
    if (schema instanceof S.SchemaMapConstructorError) {
      const self = Constructor.for(schema.self)
      return (u) => Th.mapError_(self(u), schema.mapError)
    }
    if (schema instanceof S.SchemaIdentity) {
      return (u) => Th.succeed(u)
    }
    if (schema instanceof S.SchemaCompose) {
      const self = Constructor.for(schema.self)
      const that = Constructor.for(schema.that)
      return (u) =>
        Th.chain_(
          self(u)["|>"](Th.mapError((e) => S.compositionE(Chunk.single(S.prevE(e))))),
          (a, w) =>
            that(a)["|>"](
              Th.foldM(
                (a) => (w._tag === "Some" ? Th.warn(a, w.value) : Th.succeed(a)),
                (a, e) =>
                  w._tag === "Some"
                    ? Th.warn(
                        a,
                        S.compositionE(Chunk.append_(w.value.errors, S.nextE(e)))
                      )
                    : Th.warn(a, e),
                (e) =>
                  w._tag === "None"
                    ? Th.fail(S.compositionE(Chunk.single(S.nextE(e))))
                    : Th.fail(S.compositionE(Chunk.append_(w.value.errors, S.nextE(e))))
              )
            )
        )
    }
    if (schema instanceof S.SchemaConstructor) {
      return schema.of
    }
    if (schema instanceof S.SchemaRefinement) {
      const self = Constructor.for(schema.self)
      return (u) =>
        Th.chain_(
          self(u)["|>"](Th.mapError((e) => S.compositionE(Chunk.single(S.prevE(e))))),
          (
            a,
            w
          ): Th.These<
            S.CompositionE<S.PrevE<unknown> | S.NextE<S.RefinementE<unknown>>>,
            unknown
          > =>
            schema.refinement(a)
              ? w._tag === "Some"
                ? Th.warn(a, w.value)
                : Th.succeed(a)
              : Th.fail(
                  S.compositionE(
                    w._tag === "None"
                      ? Chunk.single(S.nextE(S.refinementE(schema.error(a))))
                      : Chunk.append_(
                          w.value.errors,
                          S.nextE(S.refinementE(schema.error(a)))
                        )
                  )
                )
        )
    }
    return miss()
  })
)
