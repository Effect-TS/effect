import * as Effect from "effect/Effect"
import { pathToFileURL } from "node:url"

const modulePath = process.argv[2]
const { Fixtures } = await import(pathToFileURL(modulePath).href)
console.log(JSON.stringify(await Effect.runPromise(Fixtures.make)))
