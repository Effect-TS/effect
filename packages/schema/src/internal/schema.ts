import { pipeArguments } from "effect/Pipeable"
import * as AST from "../AST.js"
import type * as S from "../Schema.js"

/** @internal */
export const TypeId: S.TypeId = Symbol.for("@effect/schema/Schema") as S.TypeId

/** @internal */
export const make = <A, I, R>(ast: AST.AST): S.Schema<A, I, R> => new Schema(ast)

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
  annotations(annotations: AST.Annotations) {
    return new Schema(AST.annotations(this.ast, annotations))
  }
}
