/**
 * The composition root for the program that yields the record. Its
 * requirement is the whole file system, so the only layer that satisfies it
 * is one that provides every operation; this root therefore bundles all
 * thirty implementations. That is what `yield* FileSystem` costs.
 */
import * as Effect from "effect/Effect"
import { layer } from "./NodeFileSystem.ts"
import { backupViaRecord } from "./program-record.ts"

const path = process.argv[2] ?? "package.json"

Effect.runPromise(backupViaRecord(path).pipe(Effect.provide(layer))).then(
  (size) => process.stdout.write(`backed up ${size} bytes of ${path}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)
