/**
 * Enables opt-in runtime compilation for synchronous Schema decoding and type
 * guards when imported for its side effect.
 *
 * @since 4.0.0
 */
import { decode, is } from "../../internal/schema/compiler.ts"
import * as CompilerHook from "../../internal/schema/compilerHook.ts"

CompilerHook.install({ decode, is })
