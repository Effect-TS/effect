import * as Data from "effect/Data"
import type { Prompt } from "../../Prompt.js"

/** @internal */
export const Action = Data.taggedEnum<Prompt.ActionDefinition>()
