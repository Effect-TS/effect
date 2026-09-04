/**
 * Enables opt-in runtime compilation for Schema parsing and type guards when
 * imported for its side effect.
 *
 * Importing this module installs the compiler without compiling schemas. On
 * first use, `SchemaParser` stores exactly one parser for an AST in its central
 * cache: either the interpreter or a compiled parser. No compiled schema or
 * separate parser cache is exposed.
 *
 * For an encoding-free AST, a compiled parser has a generated `is` phase that
 * returns a decoded value or a private invalid sentinel. On invalid input, a
 * lazily created `decode` phase constructs the normal `SchemaIssue`. Explicit
 * parse options go directly through `decode`.
 *
 * An AST containing an encoding skips the root `is` phase. Its compiled
 * `decode` orchestrates transformations and middleware once, while resolving
 * the schemas before, between, and after them through the same central cache.
 * Unsupported structural parents can likewise remain interpreted while their
 * supported children compile; no parallel parser cache is introduced.
 *
 * Unsupported or unprofitable AST roots use the interpreter. Generated paths
 * also fall back when the runtime blocks dynamic code generation through the
 * `Function` constructor. Because an invalid default decode can evaluate
 * supported getters and checks in both phases, getters must be replay-safe and
 * checks must be free of observable side effects. Transformations and
 * middleware are outside that replay region.
 *
 * @since 4.0.0
 */
import { compile } from "../../internal/schema/compiler.ts"
import * as CompilerHook from "../../internal/schema/compilerHook.ts"

CompilerHook.install(compile)
