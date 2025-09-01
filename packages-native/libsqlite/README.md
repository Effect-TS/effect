# @effect-native/libsqlite

Universal, version‑pinned libsqlite3 that Just Works — prebuilt via Nix for macOS and Linux (glibc), with three usage styles.

## Install

```
bun add @effect-native/libsqlite@3.50
```

The npm version matches the bundled SQLite version (e.g., `3.50.2`). JS‑only fixes may use `-N` suffix (e.g., `3.50.2-1`).

## Usage

### 1) Typical Node/Bun — just a string path

```ts
import { pathToLibSqlite } from "@effect-native/libsqlite"
// IMPORTANT: gotta setCustomSQLite before loading any databases
Database.setCustomSQLite(pathToLibSqlite)
```

### 2) Power user — static paths, zero logic

```ts
import { linux_x86_64 } from "@effect-native/libsqlite/paths"
// IMPORTANT: gotta setCustomSQLite before loading any databases
Database.setCustomSQLite(linux_x86_64)
```

### 3) Effect user — idiomatic Effect API

```ts
import { getLibSqlitePath } from "@effect-native/libsqlite/effect"
import * as Effect from "effect/Effect"

const program = Effect.gen(function* () {
  // IMPORTANT: gotta setCustomSQLite before loading any databases
  Database.setCustomSQLite(yield* getLibSqlitePath)

  const sql = yield* SqliteClient
  sql.loadExtension(yield* getPathToCrSqliteExtension)
})
```

## Platforms

- macOS: arm64, x86_64
- Linux (glibc): x86_64, aarch64

If you'd like musl or Windows support, please open an issue and we'll prioritize it. We actively want to support platforms you care about.

## Versioning

- Embedded scheme: `major.minor` mirrors SQLite; `patch` encodes both SQLite patch and wrapper patch.
  - `patch = sqlitePatch * 100 + wrapperPatch`
  - Example: SQLite `3.50.2`, first wrapper → `3.50.200`; next wrapper → `3.50.201`.
- SemVer behavior: normal `^3.50.0` ranges see wrapper updates within the same SQLite minor.
- Exact SQLite version is recorded in `lib/metadata.json` and surfaced in docs.

---

# Example: Embed and use libsqlite and crsqlite in a compiled Bun single file executable

```ts
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
```
