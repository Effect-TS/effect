/**
 * @since 1.0.0
 */

import { pipeArguments } from "effect/Pipeable"
import type * as AST from "../AST.js"
import type * as Schema from "../Schema.js"

/** @internal */
export const TypeId: Schema.TypeId = Symbol.for("@effect/schema/Schema") as Schema.TypeId

/** @internal */
export const make = <I, A>(ast: AST.AST): Schema.Schema<I, A> => new SchemaImpl(ast)

const variance = {
  From: (_: any) => _,
  To: (_: any) => _
}

class SchemaImpl<From, To> implements Schema.Schema<From, To> {
  readonly [TypeId] = variance
  constructor(readonly ast: AST.AST) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
}
