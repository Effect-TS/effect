/**
 * @since 1.0.0
 */
import type { AST } from "@fp-ts/codec/AST"
import * as ast from "@fp-ts/codec/AST"
import type { Schema } from "@fp-ts/codec/Schema"
import type { Support } from "@fp-ts/codec/Support"

export const make = <A>(ast: AST): Schema<A> => ({ ast }) as any

export const declare = <Schemas extends ReadonlyArray<Schema<any>>>(
  id: symbol,
  support: Support,
  ...schemas: Schemas
): Schema<any> => make(ast.declare(id, support, schemas.map((s) => s.ast)))
