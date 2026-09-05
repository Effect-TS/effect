/**
 * Provides selective just-in-time compilation for Schema decoders. Use
 * {@link enable} to enable JIT compilation for one exact AST, or import
 * `effect/unstable/schema/SchemaJITCompiler/enable` for its side effect to
 * enable compilation globally.
 *
 * @since 4.0.0
 */
import * as CompilerRegistry from "../../internal/schema/compilerRegistry.ts"
import { compile } from "../../internal/schema/jitCompiler.ts"
import type * as SchemaAST from "../../SchemaAST.ts"

const compileScoped = CompilerRegistry.makeScopedCompiler(compile)

/**
 * Enables JIT compilation for an exact AST and its decoding dependencies.
 *
 * **Details**
 *
 * The AST is installed immediately, while its `is`, `validate`, and `decode`
 * operations remain lazy. Existing compiled descendants are preserved and
 * lazy boundaries are compiled when first reached. If dynamic function
 * generation is unavailable, decoding continues through the interpreter.
 *
 * @category compilation
 * @since 4.0.0
 */
export const enable = (ast: SchemaAST.AST): void => {
  compileScoped(ast)
}
