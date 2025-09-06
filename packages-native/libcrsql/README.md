# @effect-native/libcrsql

Absolute paths to the cr-sqlite extension binaries for common desktop/server platforms, plus an optional Effect entrypoint.

Supported platforms (verified on release):
- macOS: darwin-aarch64, darwin-x86_64
- Linux: linux-aarch64, linux-x86_64
- Windows: win-x86_64, win-i686

## Install

```sh
pnpm add @effect-native/libcrsql
```

## Usage (no Effect)

```ts
import Database from "better-sqlite3"
import { pathToCrSqliteExtension, getCrSqliteExtensionPathSync } from "@effect-native/libcrsql"

const db = new Database(":memory:")
db.loadExtension(pathToCrSqliteExtension)
// or explicit
// db.loadExtension(getCrSqliteExtensionPathSync("linux-x86_64"))
```

## Using with @effect/sql-sqlite-node

Use the Node Sqlite client from Effect and load the CR‑SQLite extension before running queries.

Simple usage (Effect):

```ts
import { SqliteClient } from "@effect/sql-sqlite-node"
import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"
import { Effect, Layer } from "effect"

const SqliteBase = SqliteClient.layer({ filename: ":memory:" })

const program = Effect.gen(function* () {
  const client = yield* SqliteClient.SqliteClient
  const ext = yield* getCrSqliteExtensionPath
  yield* client.loadExtension(ext)
  const rows = yield* client`SELECT hex(crsql_site_id()) AS site_id`
  console.log(rows[0].site_id)
}).pipe(Effect.provide(SqliteBase))
```

Idiomatic Layer composition for tests:

```ts
import { SqliteClient } from "@effect/sql-sqlite-node"
import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"
import { Effect, Layer } from "effect"

const SqliteBase = SqliteClient.layer({ filename: ":memory:" })

export const SqliteWithCr = Layer.effect(
  SqliteClient.SqliteClient,
  Effect.gen(function* () {
    const client = yield* SqliteClient.SqliteClient
    const ext = yield* getCrSqliteExtensionPath
    yield* client.loadExtension(ext)
    return client
  })
).pipe(Layer.provide(SqliteBase))

// Use in tests
// it.scoped("works", () => Effect.provide(SqliteWithCr)(...))
```

Notes:
- better‑sqlite3 compiles with SQLite built in; you do not need @effect‑native/libsqlite for Node.
- If you need to control the SQLite binary (e.g. Bun), use @effect‑native/libsqlite and its `Database.setCustomSQLite` APIs.

## Absolute constants (no side effects)

```ts
import { linux_x86_64 } from "@effect-native/libcrsql/paths"
// linux_x86_64 is an absolute string like
// /.../node_modules/@effect-native/libcrsql/lib/linux-x86_64/libcrsqlite.so
```

## Effect entrypoint (optional)

```ts
import { Effect } from "effect"
import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"

const program = getCrSqliteExtensionPath()
Effect.runPromise(program)
```

## Notes
- No network or postinstall scripts. Binaries are bundled in `lib/`.
- Android and iOS are out of scope for this release.
- Root and paths entrypoints have zero external runtime dependencies.

## Versioning Policy

- This package embeds the upstream cr-sqlite version into the npm SemVer patch field.
- Mapping: `<upstream-major>.<upstream-minor>.<upstream-patch>` → npm `<major>.<minor>.<patch>` where `patch = upstreamPatch * 100 + wrapperPatch`.
  - Example: upstream `0.16.3` → npm `0.16.300` (first wrapper release). Subsequent wrapper patches: `0.16.301`, `0.16.302`, ...
  - Next upstream `0.16.4` → npm `0.16.400` (then wrapper patches continue).
- The exact upstream version is exported:

```ts
import { CRSQLITE_VERSION } from "@effect-native/libcrsql" // or /effect
console.log(CRSQLITE_VERSION) // "0.16.3"
```

## Performance Note

The module uses a synchronous file existence check (`fs.accessSync`) to ensure the returned path points to a real binary. This runs once per import/use and is acceptable for this package’s contract. If needed, this can be revisited later with memoization.
## Binary Integrity

Run a local integrity check to verify bundled binaries match the expected SHA256:

```sh
pnpm --filter @effect-native/libcrsql run verify
```

---

# Examples

## nodejs + better-sqlite3

```ts
import Database from "better-sqlite3"
import { pathToCrSqliteExtension } from "@effect-native/libcrsql"

const db = new Database(":memory:")
db.loadExtension(pathToCrSqliteExtension)

console.log("LibSqlite loaded successfully?", db.prepare("SELECT sqlite_version() AS sqlite_version").get())

console.log("CR-SQLite extension loaded successfully")
console.log("Site ID:", db.prepare("SELECT hex(crsql_site_id()) as site_id").get())
```


## bun build --compile

Embed libsqlite and crsqlite extension in a compiled Bun single file executable.

```ts
/* eslint-disable @typescript-eslint/no-require-imports */

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
console.log("LibSqlite loaded successfully?", db.query("SELECT sqlite_version() AS sqlite_version").get())
db.loadExtension(embeddedCrSqliteExtensionPath, "sqlite3_crsqlite_init")

try {
} catch (cause) {
  if (!String(cause).includes("no such file")) throw cause
  const embeddedCrSqliteExtensionFile = Bun.file(embeddedCrSqliteExtensionPath)
  const exportedCrSqliteExtensionPath = `./.${embeddedCrSqliteExtensionFile.name}`
  Bun.write(exportedCrSqliteExtensionPath, embeddedCrSqliteExtensionFile)
  db.loadExtension(exportedCrSqliteExtensionPath, "sqlite3_crsqlite_init")
}

console.log("CRSQLite extension loaded successfully?", db.query("SELECT hex(crsql_site_id()) AS siteId").get())
```

## bun build --compile

Embed libsqlite and crsqlite extension in a compiled Bun single file executable.

```ts
/* eslint-disable @typescript-eslint/no-require-imports */
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
