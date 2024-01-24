/**
 * @since 1.0.0
 */

import { pipeArguments } from "effect/Pipeable"
import type * as AST from "../AST.js"
import type * as Schema from "../Schema.js"

/** @internal */
export const TypeId: Schema.TypeId = Symbol.for("@effect/schema/Schema") as Schema.TypeId

/** @internal */
export const make = <R, I, A>(ast: AST.AST): Schema.Schema<R, I, A> => new SchemaImpl(ast)

/** @internal */
export const variance = {
  /* c8 ignore next */
  R: (_: never) => _,
  /* c8 ignore next */
  From: (_: any) => _,
  /* c8 ignore next */
  To: (_: any) => _
}

class SchemaImpl<R, From, To> implements Schema.Schema<R, From, To> {
  readonly [TypeId] = variance
  constructor(readonly ast: AST.AST) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
}
