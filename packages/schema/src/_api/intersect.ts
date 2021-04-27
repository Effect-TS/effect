// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import { augmentRecord } from "../_utils"
import * as Arbitrary from "../Arbitrary"
import * as Constructor from "../Constructor"
import * as Encoder from "../Encoder"
import * as Guard from "../Guard"
import * as Parser from "../Parser"
import * as Th from "../These"

export type IntersectionSchema<
  SelfParserError extends S.SchemaError<any>,
  ThatParserError extends S.SchemaError<any>,
  SelfParsedShape extends Record<string, any>,
  ThatParsedShape extends Record<string, any>,
  SelfConstructorInput,
  ThatConstructorInput,
  SelfConstructorError extends S.SchemaError<any>,
  ThatConstructorError extends S.SchemaError<any>,
  SelfConstructedShape extends SelfParsedShape,
  ThatConstructedShape extends ThatParsedShape,
  SelfEncoded extends Record<string, any>,
  ThatEncoded extends Record<string, any>
> = S.Schema<
  unknown,
  S.IntersectionE<S.MemberE<0, SelfParserError> | S.MemberE<1, ThatParserError>>,
  SelfParsedShape & ThatParsedShape,
  SelfConstructorInput & ThatConstructorInput,
  S.IntersectionE<
    S.MemberE<0, SelfConstructorError> | S.MemberE<1, ThatConstructorError>
  >,
  SelfConstructedShape & ThatConstructedShape,
  SelfEncoded & ThatEncoded,
  {}
>

export const intersectIdentifier = Symbol.for("@effect-ts/schema/ids/intersect")

export function intersect_<
  SelfParserError extends S.SchemaError<any>,
  SelfParsedShape extends Record<string, any>,
  SelfConstructorInput,
  SelfConstructorError extends S.SchemaError<any>,
  SelfConstructedShape extends SelfParsedShape,
  SelfEncoded extends Record<string, any>,
  SelfApi,
  ThatParserError extends S.SchemaError<any>,
  ThatParsedShape extends Record<string, any>,
  ThatConstructorInput,
  ThatConstructorError extends S.SchemaError<any>,
  ThatConstructedShape extends ThatParsedShape,
  ThatEncoded extends Record<string, any>,
  ThatApi
>(
  self: S.Schema<
    unknown,
    SelfParserError,
    SelfParsedShape,
    SelfConstructorInput,
    SelfConstructorError,
    SelfConstructedShape,
    SelfEncoded,
    SelfApi
  >,
  that: S.Schema<
    unknown,
    ThatParserError,
    ThatParsedShape,
    ThatConstructorInput,
    ThatConstructorError,
    ThatConstructedShape,
    ThatEncoded,
    ThatApi
  >
): IntersectionSchema<
  SelfParserError,
  ThatParserError,
  SelfParsedShape,
  ThatParsedShape,
  SelfConstructorInput,
  ThatConstructorInput,
  SelfConstructorError,
  ThatConstructorError,
  SelfConstructedShape,
  ThatConstructedShape,
  SelfEncoded,
  ThatEncoded
> {
  const guardSelf = Guard.for(self)
  const guardThat = Guard.for(that)
  const parseSelf = Parser.for(self)
  const parseThat = Parser.for(that)
  const constructSelf = Constructor.for(self)
  const constructThat = Constructor.for(that)
  const encodeSelf = Encoder.for(self)
  const encodeThat = Encoder.for(that)
  const arbSelf = Arbitrary.for(self)
  const arbThat = Arbitrary.for(that)

  const guard = (u: unknown): u is SelfParsedShape & ThatParsedShape =>
    guardSelf(u) && guardThat(u)

  return pipe(
    S.identity(guard),
    S.parser((u) => {
      const left = Th.result(parseSelf(u))
      const right = Th.result(parseThat(u))

      let errors = Chunk.empty<
        S.MemberE<0, SelfParserError> | S.MemberE<1, ThatParserError>
      >()

      let errored = false
      let warned = false

      const intersection = ({} as unknown) as SelfParsedShape & ThatParsedShape

      if (left._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(0, left.left))

        errored = true
      } else {
        const warnings = left.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(errors, S.memberE(0, warnings.value))

          warned = true
        }
        Object.assign(intersection, left.right.get(0))
      }
      if (right._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(1, right.left))

        errored = true
      } else {
        const warnings = right.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(errors, S.memberE(1, warnings.value))

          warned = true
        }
        Object.assign(intersection, right.right.get(0))
      }

      if (errored) {
        return Th.fail(S.intersectionE(errors))
      }

      augmentRecord(intersection)

      if (warned) {
        return Th.warn(intersection, S.intersectionE(errors))
      }

      return Th.succeed(intersection)
    }),
    S.constructor((u: SelfConstructorInput & ThatConstructorInput) => {
      const left = Th.result(constructSelf(u))
      const right = Th.result(constructThat(u))

      let errors = Chunk.empty<
        S.MemberE<0, SelfConstructorError> | S.MemberE<1, ThatConstructorError>
      >()

      let errored = false
      let warned = false

      const intersection = ({} as unknown) as SelfConstructedShape &
        ThatConstructedShape

      if (left._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(0, left.left))

        errored = true
      } else {
        const warnings = left.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(errors, S.memberE(0, warnings.value))

          warned = true
        }
        Object.assign(intersection, left.right.get(0))
      }
      if (right._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(1, right.left))

        errored = true
      } else {
        const warnings = right.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(errors, S.memberE(1, warnings.value))

          warned = true
        }
        Object.assign(intersection, right.right.get(0))
      }

      if (errored) {
        return Th.fail(S.intersectionE(errors))
      }

      augmentRecord(intersection)

      if (warned) {
        return Th.warn(intersection, S.intersectionE(errors))
      }

      return Th.succeed(intersection)
    }),
    S.encoder((_): SelfEncoded & ThatEncoded => ({
      ...encodeSelf(_),
      ...encodeThat(_)
    })),
    S.arbitrary((FC) => {
      const self = arbSelf(FC)
      const that = arbThat(FC)
      return self.chain((a) => that.map((b) => ({ ...a, ...b })))
    }),
    S.identified(intersectIdentifier, { self, that })
  )
}

export function intersect<
  ThatParserError extends S.SchemaError<any>,
  ThatParsedShape extends Record<string, any>,
  ThatConstructorInput,
  ThatConstructorError extends S.SchemaError<any>,
  ThatConstructedShape extends ThatParsedShape,
  ThatEncoded extends Record<string, any>,
  ThatApi
>(
  that: S.Schema<
    unknown,
    ThatParserError,
    ThatParsedShape,
    ThatConstructorInput,
    ThatConstructorError,
    ThatConstructedShape,
    ThatEncoded,
    ThatApi
  >
): <
  SelfParserError extends S.SchemaError<any>,
  SelfParsedShape extends Record<string, any>,
  SelfConstructorInput,
  SelfConstructorError extends S.SchemaError<any>,
  SelfConstructedShape extends SelfParsedShape,
  SelfEncoded extends Record<string, any>,
  SelfApi
>(
  self: S.Schema<
    unknown,
    SelfParserError,
    SelfParsedShape,
    SelfConstructorInput,
    SelfConstructorError,
    SelfConstructedShape,
    SelfEncoded,
    SelfApi
  >
) => S.Schema<
  unknown,
  S.IntersectionE<S.MemberE<0, SelfParserError> | S.MemberE<1, ThatParserError>>,
  SelfParsedShape & ThatParsedShape,
  SelfConstructorInput & ThatConstructorInput,
  S.IntersectionE<
    S.MemberE<0, SelfConstructorError> | S.MemberE<1, ThatConstructorError>
  >,
  SelfConstructedShape & ThatConstructedShape,
  SelfEncoded & ThatEncoded,
  {}
> {
  return (self) => intersect_(self, that)
}
