import { writeFileSync } from "node:fs"
import { compile } from "effect/unstable/schema/SchemaAOTCompiler"
import { targets } from "./cases.ts"

writeFileSync(process.argv[2], compile(targets))
