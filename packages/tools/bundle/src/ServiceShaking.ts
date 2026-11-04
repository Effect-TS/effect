/**
 * Experimental Rolldown bundling that removes unused methods from Effect
 * service implementations.
 *
 * Rolldown only tree-shakes top-level statements and ES module namespace
 * members, so a provider object such as the `FileSystem` built by
 * `NodeFileSystem.layer` keeps every method, and every module-scope helper
 * those methods reference, even when the program only calls `readFile`.
 *
 * `bundle` is the entrypoint for the feasibility experiment tracked in
 * EFF-3380. The intended design records which methods are read from each
 * service key, prunes the corresponding provider object literals, and lets
 * Rolldown's statement-level shaker drop the orphaned helpers. Any access the
 * analysis cannot account for, including inspection of the service object,
 * must keep every method.
 *
 * The current implementation performs a plain Rolldown build and does not
 * prune anything yet.
 *
 * @since 4.0.0
 */
import { rolldown } from "rolldown"
import type { InputOptions } from "rolldown"

/**
 * Bundles a single entrypoint as ESM and returns the generated code, removing
 * service methods the bundled program cannot observe.
 *
 * @category bundling
 * @since 4.0.0
 */
export const bundle = async (options: InputOptions): Promise<string> => {
  const build = await rolldown(options)
  try {
    const { output } = await build.generate({ format: "esm" })
    return output[0].code
  } finally {
    await build.close()
  }
}
