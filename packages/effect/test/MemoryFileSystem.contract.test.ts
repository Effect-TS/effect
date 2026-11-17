import { describe } from "@effect/vitest"
import { Effect, FileSystem, Layer } from "effect"
import * as MemoryFileSystem from "effect/MemoryFileSystem"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { testGlob, testLayer } from "./FileSystem.test-utils.ts"

const fixture = new URL("./fixtures/text.txt", import.meta.url)
const fixturePath = fileURLToPath(fixture)
const fixtureBytes = readFileSync(fixture)
const seeded = Layer.effect(
  FileSystem.FileSystem,
  Effect.gen(function*() {
    const fs = yield* MemoryFileSystem.make
    yield* fs.makeDirectory(fileURLToPath(new URL("./fixtures", import.meta.url)), { recursive: true })
    yield* fs.writeFile(fixturePath, fixtureBytes)
    return fs
  })
)

describe("MemoryFileSystem shared contract", () => {
  testLayer(seeded)
  testGlob(MemoryFileSystem.layer)
})
