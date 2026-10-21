import type { Fragment } from "effect/sql/Statement"

import type { SqlExpression as DirectSqlExpression } from "./sqlExpression.ts"

/** Adapter-owned table metadata. No driver or ORM type enters the shared models. */
export interface TableModel {
  readonly table: object
  readonly column: string
  readonly select: Record<string, unknown>
  readonly insert: Record<string, unknown>
}

/** The owning adapter validates the physical table metadata; domain values
 * remain subject to the mapping codecs. */
export interface AnyTableModel extends TableModel {
  // oxlint-disable-next-line no-explicit-any -- native table handle, never a domain value or an Effect error.
  readonly table: any
}

/** Opaque native SQL expression for explicit adapter mappings. */
export type SqlExpression =
  | Fragment
  | DirectSqlExpression
  | { readonly getSQL: () => SqlExpression }
