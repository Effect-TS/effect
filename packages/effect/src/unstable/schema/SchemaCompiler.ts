/**
 * Enables opt-in runtime compilation for Schema parsing and type guards when
 * imported for its side effect.
 *
 * Importing this module installs the compiler without compiling schemas. On
 * first use, `SchemaParser` stores exactly one parser for an AST in its central
 * cache: either the interpreter or a compiled parser. No compiled schema or
 * separate parser cache is exposed.
 *
 * A supported type-side AST has up to three independently lazy operations:
 * `is` validates without materializing an output, `validate` returns a decoded
 * value or a private invalid sentinel, and `decode` returns a decoded value or
 * the normal `SchemaIssue`. `is` is omitted when validation requires a
 * reconstructed value. Every operation honors explicit parse options.
 *
 * An AST containing an encoding skips the root `is` phase. Its compiled
 * `decode` orchestrates transformations and middleware once, while resolving
 * the schemas before, between, and after them through the same central cache.
 * Unsupported structural parents can likewise remain interpreted while their
 * supported children compile; no parallel parser cache is introduced.
 *
 * Unsupported or unprofitable AST roots use the interpreter. Generated paths
 * also fall back when the runtime blocks dynamic code generation through the
 * `Function` constructor. Because an invalid type-side decode can evaluate
 * input property getters, checks, and declaration parsers in both `validate`
 * and `decode`, they must be replay-safe and free of observable side effects;
 * declaration parsers must also be synchronous. Transformations and middleware
 * are executed only by `decode` and are outside that replay region.
 *
 * @since 4.0.0
 */
import { compile } from "../../internal/schema/compiler.ts"
import * as CompilerHook from "../../internal/schema/compilerHook.ts"

CompilerHook.install(compile)
