/**
 * The generator configuration.
 *
 * A project describes its generator setup in a `graphql.config.ts` whose
 * default export is wrapped in {@link defineConfig}. The top-level `schema`
 * and `documents` keys are the ones graphql-config reads, so editor tooling
 * such as the VS Code GraphQL extension can share the same file.
 *
 * ```ts
 * import { defineConfig } from "@effect/graphql-generator/Config"
 *
 * export default defineConfig({
 *   schema: "./schema/github.graphql",
 *   documents: ["src/**\/*.graphql"],
 *   scalars: {
 *     DateTime: "effect/Schema#DateTimeUtcFromString",
 *     URI: "./scalars.ts#Uri"
 *   }
 * })
 * ```
 *
 * @since 4.0.0
 */
import * as Schema from "effect/Schema"

/**
 * A `"<module>#<export>"` reference to a `Schema` codec for a custom scalar.
 * Relative modules resolve against the config file; bare modules are imported
 * as written.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.0
 */
export const ScalarSpecifier = Schema.TemplateLiteral([Schema.String, "#", Schema.String])

/**
 * The configuration `Schema`, used to decode a config file's default export.
 *
 * - `schema`: the SDL (`.graphql`) or introspection JSON (`.json`) file,
 *   relative to the config file.
 * - `documents`: glob patterns (`*`, `**`, `?`, `{a,b}`) for the executable
 *   documents, relative to the config file. `node_modules` and dot-directories
 *   are skipped, and the schema file is never treated as a document.
 * - `scalars`: a `Schema` codec per custom scalar, also able to override the
 *   built-in `Int`, `Float` and `ID`. Unmapped custom scalars decode as
 *   `Schema.Json`.
 * - `shared`: where the shared module goes. Defaults to the schema's name and
 *   directory, e.g. `github.graphql` or `github.json` gives
 *   `github.graphql.ts`.
 * - `importExtension`: the extension used in imports between generated files
 *   and to relative scalar modules. Defaults to `.ts`.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.0
 */
export const Config = Schema.Struct({
  schema: Schema.String,
  documents: Schema.Array(Schema.String),
  scalars: Schema.optional(Schema.Record(Schema.String, ScalarSpecifier)),
  shared: Schema.optional(Schema.String),
  importExtension: Schema.optional(Schema.Literals([".ts", ".js", ""]))
})

/**
 * A decoded generator configuration.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type Config = typeof Config.Type

/**
 * Types a config file's default export. It returns its argument unchanged.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const defineConfig = (config: Config): Config => config
