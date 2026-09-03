/**
 * Enables opt-in runtime compilation for synchronous Schema decoding and type
 * guards.
 *
 * @since 4.0.0
 */
import { compile } from "../../internal/schema/compiler.ts"
import * as CompilerHook from "../../internal/schema/compilerHook.ts"

/**
 * Enables lazy compilation of supported schema decoders and type guards.
 *
 * **When to use**
 *
 * Use when an application repeatedly executes synchronous decoders or type
 * guards and can enable compilation during startup while keeping the normal
 * `SchemaParser` interface.
 *
 * **Details**
 *
 * Calling `enable` does not compile existing schemas. A supported decoder is
 * compiled and cached when it first runs through a synchronous `SchemaParser`
 * decoding function or `SchemaParser.is`.
 *
 * **Gotchas**
 *
 * Call `enable` before the first execution of decoders or type guards that
 * should be compiled. Unsupported schemas, explicit parse options, and
 * environments that disallow dynamic function generation continue to use the
 * interpreter.
 *
 * @category configuration
 * @since 4.0.0
 */
export function enable(): void {
  CompilerHook.install(compile)
}
