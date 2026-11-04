// A test that provides one of the two operations the program uses and forgets the other.
import * as Effect from "effect/Effect"
import * as FileSystem from "../../src/FileSystem.ts"
import { backup } from "../../src/program.ts"

Effect.runPromise(
  backup("a.txt").pipe(
    Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(new Uint8Array()))
  )
)
