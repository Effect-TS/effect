/**
 * The codegen configuration: which moby API document is pinned, where the
 * generated file goes, and the hand-written patches applied before the
 * standing patch families.
 *
 * @since 4.0.6
 */
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

/**
 * The decoded `codegen.yaml`.
 *
 * **Details**
 *
 * - `spec` is moby's `api/swagger.yaml` at a pinned commit; `apiVersion` must
 *   match its `info.version`, and is our maximum API version.
 * - `output` is resolved relative to the configuration file.
 * - `since` is the `@since` version of the generated definitions.
 * - `patches` are inline JSON Patch documents, applied in order before the
 *   computed patch families.
 *
 * @category models
 * @since 4.0.6
 */
export const CodegenConfig = Schema.Struct({
  spec: Schema.String,
  apiVersion: Schema.String,
  output: Schema.String,
  header: Schema.String,
  since: Schema.String,
  patches: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultType(Effect.succeed([]))),
  excludeAnnotations: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultType(Effect.succeed([])))
})

/**
 * @category models
 * @since 4.0.6
 */
export type CodegenConfig = typeof CodegenConfig.Type
