import { MssqlClient } from "@effect/sql-mssql"
import { Effect } from "effect"

export default Effect.flatMap(
  MssqlClient.MssqlClient,
  (sql) =>
    sql`CREATE TABLE people (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT GETDATE()
    )`
)
