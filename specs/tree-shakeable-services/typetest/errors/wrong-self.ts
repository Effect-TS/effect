// The identity passed to Context.Operations must be exactly the union of the members' keys.
import * as Context from "effect/Context"
import { readFile, writeFile } from "../../src/FileSystem.ts"

export const Partial = Context.Operations<"effect/FileSystem/readFile">()("test/Partial", { readFile, writeFile })
