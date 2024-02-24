import { dual } from "effect/Function"
import { pipeArguments } from "effect/Pipeable"
import * as AST from "../AST.js"
import type * as S from "../Schema.js"

/** @internal */
export const TypeId: S.TypeId = Symbol.for("@effect/schema/Schema") as S.TypeId

/** @internal */
export const make = <A, I, R>(ast: AST.AST): S.Schema<A, I, R> => new Schema(ast)

/** @internal */
export const annotations: {
  (annotations: AST.Annotations): <A, I, R>(self: S.Schema<A, I, R>) => S.Schema<A, I, R>
  <A, I, R>(self: S.Schema<A, I, R>, annotations: AST.Annotations): S.Schema<A, I, R>
} = dual(
  2,
  <A, I, R>(self: S.Schema<A, I, R>, annotations: AST.Annotations): S.Schema<A, I, R> =>
    make(AST.annotations(self.ast, annotations))
)

/** @internal */
export const variance = {
  /* c8 ignore next */
  _A: (_: any) => _,
  /* c8 ignore next */
  _I: (_: any) => _,
  /* c8 ignore next */
  _R: (_: never) => _
}

class Schema<A, I, R> implements S.Schema<A, I, R> {
  readonly [TypeId] = variance
  constructor(readonly ast: AST.AST) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
}
