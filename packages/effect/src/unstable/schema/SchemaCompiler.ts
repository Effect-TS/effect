/**
 * Provides the shared registry used by Schema decoder implementations. A
 * decoder installed with {@link set} is consumed transparently by the normal
 * `SchemaParser` APIs, allowing runtime and ahead-of-time compilers to use the
 * same cache without introducing a compiled Schema type or a second parser API.
 *
 * The cache associates each exact AST with an entry containing decoder
 * operations, never parsing results. The interpreter uses the same registry
 * with lazy `decodeEffect` and constructor fallback; JIT, AOT, and manual
 * installations may supply `makeEffect` and the optional validation fast paths.
 *
 * @since 4.0.0
 */
import type * as Effect from "../../Effect.ts"
import * as CompilerRegistry from "../../internal/schema/compilerRegistry.ts"
import * as InternalParser from "../../internal/schema/parser.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaIssue from "../../SchemaIssue.ts"

/**
 * The result returned by {@link Validate} when validation fails.
 *
 * @category symbols
 * @since 4.0.0
 */
export const invalid = CompilerRegistry.invalid

/**
 * The sentinel distinguishing an absent input from a present `undefined`.
 * Decoders and constructors propagate it as a successful result when no value
 * is produced. Parents omit optional fields or report missing required keys;
 * public root adapters reject it rather than returning it to callers.
 *
 * @category symbols
 * @since 4.0.0
 */
export const missing = InternalParser.missing

/**
 * A compiled boolean validator.
 *
 * **Details**
 *
 * This optional fast path avoids constructing output. Omit it when validation
 * requires reconstructed values, such as a Struct check that must see the
 * object after excess properties are removed. Type guards then use ordinary
 * decoding, including `validate` and its diagnostic fallback when available.
 * It must honor the supplied parse options; public `Schema.is` and
 * `SchemaParser.is` use the defaults.
 *
 * @category models
 * @since 4.0.0
 */
export interface Is {
  (input: unknown, options: SchemaAST.ParseOptions): boolean
}

/**
 * A compiled validator that returns the decoded value without constructing
 * diagnostic issues.
 *
 * **Details**
 *
 * This optional synchronous fast path lets valid inputs return their output
 * without the detailed decoding pass. For decoding, the registry follows
 * {@link invalid} with `decodeEffect` because the sentinel provides no error details
 * and can also occur as a valid input value. Type guards without an `is` operation
 * use this same fallback. Omit this operation
 * when the fast path is unsupported or replay would be unsafe, including ASTs
 * containing transformations or middleware.
 *
 * It must honor every supported `ParseOptions` value. Return {@link invalid}
 * for invalid input, never for an unsupported optimization. The detailed decoder
 * must also accept valid data that happens to equal this marker. Do not call
 * the detailed decoder and discard its failure: decoding would run `decodeEffect`
 * again after `invalid`. User checks may themselves construct issues.
 *
 * @category models
 * @since 4.0.0
 */
export interface Validate {
  (input: unknown, options: SchemaAST.ParseOptions): unknown | typeof invalid
}

/**
 * A compiled decoder that returns detailed Schema issues on failure.
 *
 * **Details**
 *
 * This required operation implements complete decoding for its AST, including
 * transformations, middleware, and asynchronous work when present. It makes
 * every parser API usable without optional fast paths and provides diagnostics
 * after `validate` returns `invalid`. The implementation can also be interpreted;
 * invoking `decodeEffect` does not imply a switch from compiled to interpreted parsing.
 *
 * @category models
 * @since 4.0.0
 */
export interface Decode {
  (input: unknown, options: SchemaAST.ParseOptions): Effect.Effect<unknown, SchemaIssue.Issue, any>
}

/**
 * The operations installed for an AST in the shared Schema parser registry.
 *
 * **Details**
 *
 * `decodeEffect` is required for complete decoding and detailed failures. `validate`
 * and `is` are optional optimizations, not requirements for an AST to be usable.
 * The interpreter supplies only `decodeEffect` in this same format.
 * An optional `makeEffect` supplies complete node construction. Otherwise the
 * registry prepares and caches the interpreted constructor, never the decoder,
 * for that operation. Public makers resolve the schema's exact type-side AST.
 *
 * The registry wraps these operations in an internal entry.
 * Decoding tries `validate` when present, returning its output on success or
 * calling `decodeEffect` after `invalid`. Without `validate`, or for the {@link missing}
 * sentinel, it calls `decodeEffect` directly. Type guards prefer `is`; otherwise
 * they use ordinary decoding with the same validation/diagnostic fallback.
 * A boolean `false` from `is` needs no diagnostic replay.
 * Synchronous decoding and encoding share an adapter that returns successful
 * `validate` output directly, without wrapping it in an intermediate Effect.
 * Each operation is resolved lazily on first use, so unused fast paths need
 * not be compiled.
 * Construction calls `makeEffect` directly, without `is` or `validate`, so defaults
 * and Class constructors are not replayed after a failure. Field/element defaults
 * belong to the parent occurrence, not to the root node or a Union member.
 * Runtime options apply to construction too; Union candidate selection preserves
 * the constructor's conservative handling of absent discriminants.
 *
 * @category models
 * @since 4.0.0
 */
export interface CompiledDecoder {
  readonly is?: Is | undefined
  readonly validate?: Validate | undefined
  readonly decodeEffect: Decode
  /**
   * Constructs this node without replay, including Class construction and child
   * defaults. Omit it to use the lazy interpreted constructor. This operation
   * initializes independently from decoding and never applies its own root default.
   * Propagate `missing` as a success when no value is produced; the parent handles
   * optional omission or missing-key issues. A present `undefined` is not `missing`.
   */
  readonly makeEffect?: Decode | undefined
}

/**
 * Installs a compiled decoder for an exact AST in the shared Schema parser
 * registry.
 *
 * **Details**
 *
 * A later call for the same AST replaces the previous entry. Parser functions
 * that have already resolved and retained an earlier entry are not updated.
 * This also applies when subsequent calls use different parse options.
 * The decoder is trusted to implement the semantics of the supplied AST.
 * Installation does not evaluate operation getters. Each operation, including
 * an absent optional operation, is resolved once when first needed. Accessors
 * retain the supplied decoder as their receiver. The supplied object is not
 * mutated. JIT installation uses these same rules.
 * Replacement includes construction: omitting `makeEffect` in the replacement
 * selects interpreted construction for new consumers, without merging the old
 * operation into the new entry. Already captured constructors keep their entry.
 *
 * @category registry
 * @since 4.0.0
 */
export const set = (ast: SchemaAST.AST, decoder: CompiledDecoder): void => {
  CompilerRegistry.set(ast, decoder)
}
