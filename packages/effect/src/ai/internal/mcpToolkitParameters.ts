/** @internal */
import type * as SchemaAST from "../../SchemaAST.ts"
import * as Tool from "../Tool.ts"

/** @internal */
export const mcpParseOptions = (tool: Tool.Any): SchemaAST.ParseOptions => ({
  onExcessProperty: Tool.getStrictMode(tool) === true ? "error" : "ignore",
  errors: "all"
})

/** @internal */
export interface PreparedParameters<A = unknown> {
  readonly parameters: A
}
