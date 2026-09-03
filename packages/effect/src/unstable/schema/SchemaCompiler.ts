/**
 * Enables opt-in runtime compilation for synchronous Schema decoding and type
 * guards when imported for its side effect.
 *
 * Importing this module installs the compiler without compiling schemas
 * immediately. The first execution of a supported parser compiles and caches
 * an implementation for its AST.
 *
 * Parsers use the interpreter when a schema cannot be compiled, when explicit
 * parse options are supplied, or when the runtime blocks dynamic code
 * generation through the `Function` constructor.
 *
 * @since 4.0.0
 */
import { decode, is } from "../../internal/schema/compiler.ts"
import * as CompilerHook from "../../internal/schema/compilerHook.ts"

CompilerHook.install({ decode, is })
