import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import * as InternalTextPrompt from "./text.js"

/** @internal */
export const list = (options: Prompt.Prompt.ListOptions): Prompt.Prompt<Array<string>> =>
  InternalTextPrompt.text(options).pipe(
    InternalPrompt.map((output) => output.split(options.delimiter || ","))
  )
