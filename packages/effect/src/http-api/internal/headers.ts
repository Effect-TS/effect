import type * as SchemaAST from "../../SchemaAST.ts"

/**
 * Parse options for decoding an HTTP header map.
 *
 * Header maps always carry transport headers such as `content-type` and
 * `user-agent` that an endpoint does not declare, so header codecs never
 * reject excess properties. The option is cleared rather than set to
 * `"ignore"` so structs keep their default-options fast path.
 *
 * @internal
 */
export const decodeOptions = (
  options: SchemaAST.ParseOptions | undefined
): SchemaAST.ParseOptions | undefined =>
  options?.onExcessProperty === "error" ? { ...options, onExcessProperty: undefined } : options
