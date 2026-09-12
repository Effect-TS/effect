import { writeFileSync } from "node:fs"
import { compile } from "effect/unstable/schema/SchemaAOTCompiler"
import { roots } from "./cases.ts"

writeFileSync(process.argv[2], compile(roots))
