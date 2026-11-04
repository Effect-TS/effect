// A program that yields the record requires the whole file system. Running it unprovided prints the identity
// by name; providing two operations leaves the other twenty-eight.
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FileSystem from "../../src/FileSystem.ts"
import { backupViaRecord } from "../../src/program-record.ts"

Effect.runPromise(backupViaRecord("a.txt"))

Effect.runPromise(
  backupViaRecord("a.txt").pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.succeed(FileSystem.readFile.service, () => Effect.succeed(new Uint8Array())),
        Layer.succeed(FileSystem.writeFile.service, () => Effect.void)
      )
    )
  )
)
