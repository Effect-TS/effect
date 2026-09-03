import * as Effect from "effect/Effect"
import { createHash } from "node:crypto"
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"

const modulePath = process.argv[2]
const { Fixtures } = await import(pathToFileURL(modulePath).href)
const result = await Effect.runPromise(Fixtures.make)
console.log(JSON.stringify({
  ...result,
  modulePath: realpathSync(modulePath),
  symlink: lstatSync(modulePath).isSymbolicLink(),
  sourceHash: createHash("sha256").update(readFileSync(modulePath)).digest("hex"),
  nativeEntries: readdirSync(join(dirname(modulePath), "../fixtures")).sort(),
  effectOrigin: import.meta.resolve("effect/Effect"),
  globOrigin: import.meta.resolve("glob")
}))
