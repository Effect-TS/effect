import { PrimitivesURI } from "./primitives"
import { makeProgram, makeProgramAsync } from "./utils"

export const make = makeProgram<PrimitivesURI>()
export const makeAsync = makeProgramAsync<PrimitivesURI>()

export { makeInterpreter, makeProgram } from "./utils"
