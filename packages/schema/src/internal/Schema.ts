/**
 * @since 1.0.0
 */
import type { AST } from "@fp-ts/codec/AST"
import * as ast from "@fp-ts/codec/AST"
import type { Provider } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"

export const make = <A>(ast: AST): Schema<A> => ({ ast }) as any

export const declare = <Schemas extends ReadonlyArray<Schema<any>>>(
  id: symbol,
  provider: Provider,
  ...schemas: Schemas
): Schema<any> => make(ast.declare(id, provider, schemas.map((s) => s.ast)))
