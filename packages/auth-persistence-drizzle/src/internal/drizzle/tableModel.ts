import type { InferInsertModel, InferSelectModel, Table } from "drizzle-orm"

/** Preserve Drizzle's inferred rows and column keys at the shared mapping boundary. */
export interface DrizzleTableModel<T extends Table> {
  readonly table: T
  readonly column: Extract<keyof T["_"]["columns"], string>
  readonly select: InferSelectModel<T>
  readonly insert: InferInsertModel<T>
}
