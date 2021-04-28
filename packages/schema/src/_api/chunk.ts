// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import * as Arbitrary from "../Arbitrary"
import * as Constructor from "../Constructor"
import * as Encoder from "../Encoder"
import * as Guard from "../Guard"
import * as Parser from "../Parser"
import * as Th from "../These"
import { unknownArray } from "./unknownArray"

export const fromChunkIdentifier = Symbol.for("@effect-ts/schema/ids/fromChunk")

export function fromChunk<Self extends S.SchemaAny>(
  self: Self
): S.Schema<
  readonly S.ParserInputOf<Self>[],
  S.CollectionE<S.OptionalIndexE<number, ReturnType<Self["_ParserError"]>>>,
  Chunk.Chunk<ReturnType<Self["_ParsedShape"]>>,
  Iterable<S.ConstructorInputOf<Self>>,
  S.CollectionE<S.OptionalIndexE<number, ReturnType<Self["_ConstructorError"]>>>,
  Chunk.Chunk<ReturnType<Self["_ConstructedShape"]>>,
  readonly S.EncodedOf<Self>[],
  S.ApiOf<Self>
> {
  const guard = Guard.for(self)
  const arb = Arbitrary.for(self)
  const create = Constructor.for(self)
  const parse = Parser.for(self)
  const refinement = (_: unknown): _ is Chunk.Chunk<S.ParsedShapeOf<Self>> =>
    Chunk.isChunk(_) && Chunk.every_(_, guard)
  const encode = Encoder.for(self)

  return pipe(
    S.identity(refinement),
    S.arbitrary((_) => _.array(arb(_)).map(Chunk.from)),
    S.parser((i: readonly S.ParserInputOf<Self>[]) => {
      const b = Chunk.builder<S.ParsedShapeOf<Self>>()
      const e = Chunk.builder<S.OptionalIndexE<number, S.ParserErrorOf<Self>>>()
      let j = 0
      let err = false
      let warn = false
      for (const a of i) {
        const res = Th.result(parse(a))
        if (res._tag === "Right") {
          if (!err) {
            b.append(res.right.get(0))
            const w = res.right.get(1)
            if (w._tag === "Some") {
              warn = true
              e.append(S.optionalIndexE(j, w.value))
            }
          }
        } else {
          err = true
          e.append(S.optionalIndexE(j, res.left))
        }
        j++
      }
      if (err) {
        return Th.fail(S.chunkE(e.build()))
      }
      if (warn) {
        return Th.warn(b.build(), S.chunkE(e.build()))
      }
      return Th.succeed(b.build())
    }),
    S.constructor((i: Iterable<S.ConstructorInputOf<Self>>) => {
      const b = Chunk.builder<S.ConstructedShapeOf<Self>>()
      const e = Chunk.builder<S.OptionalIndexE<number, S.ConstructorErrorOf<Self>>>()
      let err = false
      let j = 0
      let war = false
      for (const a of i) {
        const res = Th.result(create(a))
        if (res._tag === "Right") {
          if (!err) {
            b.append(res.right.get(0))
            const w = res.right.get(1)
            if (w._tag === "Some") {
              e.append(S.optionalIndexE(j, w.value))
              war = true
            }
          }
        } else {
          err = true
          e.append(S.optionalIndexE(j, res.left))
        }
        j++
      }
      if (err) {
        return Th.fail(S.chunkE(e.build()))
      }
      if (war) {
        return Th.warn(b.build(), S.chunkE(e.build()))
      }
      return Th.succeed(b.build())
    }),
    S.encoder(
      (_) => Chunk.toArray(Chunk.map_(_, encode)) as readonly S.EncodedOf<Self>[]
    ),
    S.mapApi(() => self.Api as S.ApiOf<Self>),
    S.identified(fromChunkIdentifier, { self })
  )
}

export const chunkIdentifier = Symbol.for("@effect-ts/schema/ids/chunk")

export function chunk<Self extends S.SchemaAny>(
  self: Self
): S.Schema<
  unknown,
  S.CompositionE<
    | S.PrevE<S.RefinementE<S.LeafE<S.UnknownArrayE>>>
    | S.NextE<S.CollectionE<S.OptionalIndexE<number, S.ParserErrorOf<Self>>>>
  >,
  Chunk.Chunk<S.ParsedShapeOf<Self>>,
  Iterable<S.ConstructorInputOf<Self>>,
  S.CollectionE<S.OptionalIndexE<number, S.ConstructorErrorOf<Self>>>,
  Chunk.Chunk<S.ConstructedShapeOf<Self>>,
  readonly S.EncodedOf<Self>[],
  S.ApiOf<Self>
> {
  return pipe(
    unknownArray,
    S.constructor((i: Iterable<S.ConstructorInputOf<Self>>) =>
      Th.succeed(Array.from(i))
    ),
    S.compose(fromChunk(self)),
    S.mapConstructorError((_) => Chunk.unsafeHead(_.errors).error),
    S.mapApi(() => self.Api as S.ApiOf<Self>),
    S.identified(chunkIdentifier, { self })
  )
}
