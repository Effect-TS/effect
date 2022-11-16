/**
 * @since 1.0.0
 */
import type { AST } from "@fp-ts/codec/AST"
import * as ast from "@fp-ts/codec/AST"
import type { Schema } from "@fp-ts/codec/Schema"

export const make = <A>(ast: AST): Schema<A> => ({ ast }) as any

export const declare = <Schemas extends ReadonlyArray<Schema<any>>>(
  annotations: ReadonlyArray<unknown>,
  ...schemas: Schemas
): Schema<any> => make(ast.declare(annotations, schemas.map((s) => s.ast)))
