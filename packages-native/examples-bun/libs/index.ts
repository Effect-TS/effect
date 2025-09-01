import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
import { pathToLibSqlite } from "@effect-native/libsqlite"
import { Database } from "bun:sqlite"

Database.setCustomSQLite(pathToLibSqlite)
console.log("Using SQLite library at:", { pathToLibSqlite })

const db = new Database(":memory:")
console.log("LibSqlite loaded successfully?", db.query("SELECT sqlite_version() AS sqliteVersion").get())

try {
  console.log("CRSQLite extension works before loading?", db.query("SELECT hex(crsql_site_id()) AS siteId").get())
} catch (cause) {
  console.log("CRSQLite extension works before loading?", String(cause))
}
db.loadExtension(pathToCrSqliteExtension)
console.log("Using CRSQLite extension at:", { pathToCrSqliteExtension })
console.log("CRSQLite extension loaded successfully?", db.query("SELECT hex(crsql_site_id()) AS siteId").get())
