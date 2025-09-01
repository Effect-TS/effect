/* eslint-disable @typescript-eslint/no-require-imports */
// GOAL: embed and use libsqlite and crsqlite in a compiled Bun single file executable

import { Database } from "bun:sqlite"

import { getCrSqliteExtensionPathSync } from "@effect-native/libcrsql" with { type: "macro" }
import { getLibSqlitePathSync } from "@effect-native/libsqlite" with { type: "macro" }

const embeddedLibSqlitePath = String(require(getLibSqlitePathSync()))
const embeddedCrSqliteExtensionPath = String(require(getCrSqliteExtensionPathSync()))

if (Bun.embeddedFiles.length) {
  const embeddedLibSqliteFile = Bun.file(embeddedLibSqlitePath)
  const exportedLibSqlitePath = `./.${embeddedLibSqliteFile.name}`
  Bun.write(exportedLibSqlitePath, embeddedLibSqliteFile)
  Database.setCustomSQLite(exportedLibSqlitePath)
} else {
  Database.setCustomSQLite(embeddedLibSqlitePath)
}

const db = new Database(":memory:")
console.log("LibSqlite loaded successfully?", db.query("SELECT sqlite_version() AS sqliteVersion").get())

try {
  db.loadExtension(embeddedCrSqliteExtensionPath, "sqlite3_crsqlite_init")
} catch (cause) {
  if (!String(cause).includes("no such file")) throw cause
  const embeddedCrSqliteExtensionFile = Bun.file(embeddedCrSqliteExtensionPath)
  const exportedCrSqliteExtensionPath = `./.${embeddedCrSqliteExtensionFile.name}`
  Bun.write(exportedCrSqliteExtensionPath, embeddedCrSqliteExtensionFile)
  db.loadExtension(exportedCrSqliteExtensionPath, "sqlite3_crsqlite_init")
}

console.log("CRSQLite extension loaded successfully?", db.query("SELECT hex(crsql_site_id()) AS siteId").get())
