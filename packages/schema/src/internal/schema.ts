/**
 * @since 1.0.0
 */

import { pipeArguments } from "effect/Pipeable"
import type * as AST from "../AST.js"
import type * as Schema from "../Schema.js"

/** @internal */
export const TypeId: Schema.TypeId = Symbol.for("@effect/schema/Schema") as Schema.TypeId

/** @internal */
export const make = <A, I, R>(ast: AST.AST): Schema.Schema<A, I, R> => new SchemaImpl(ast)

/** @internal */
export const variance = {
  /* c8 ignore next */
  _A: (_: any) => _,
  /* c8 ignore next */
  _I: (_: any) => _,
  /* c8 ignore next */
  _R: (_: never) => _
}

class SchemaImpl<A, I, R> implements Schema.Schema<A, I, R> {
  readonly [TypeId] = variance
  constructor(readonly ast: AST.AST) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
}
