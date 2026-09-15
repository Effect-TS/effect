import { enable } from "effect/unstable/schema/SchemaJITCompiler"
import { roots } from "./cases.ts"

for (const ast of roots) enable(ast)

export { isExtraValid, isInvalid, isValid, parseExtraValid, parseInvalid, parseValid } from "./cases.ts"
