/**
 * @since 1.0.0
 */

declare module "@sqlite.org/sqlite-wasm" {
  export type OpenMode = "c" | "ct" | "w" | "wt" | "r" | "rt"
  export type RowMode = "object" | "array" | "stmt"

  export interface SqliteHandle {
    readonly _: unique symbol
  }

  export class DB {
    constructor(dbName?: string, mode?: OpenMode)

    readonly pointer: SqliteHandle

    exec(options: {
      sql: string
      bind?: ReadonlyArray<unknown> | undefined
      rowMode?: RowMode | undefined
      resultRows?: Array<unknown> | undefined
    })

    close(): void
  }
  class OpfsDb extends DB {}

  interface OO1 {
    readonly DB: typeof DB
    readonly OpfsDb?: typeof OpfsDb
  }

  interface CApi {
    readonly sqlite3_js_db_export: (db: SqliteHandle) => Uint8Array
  }

  interface SqliteWasm {
    readonly oo1: OO1
    readonly capi: CApi
  }

  const init: () => Promise<SqliteWasm>
  export default init
}
