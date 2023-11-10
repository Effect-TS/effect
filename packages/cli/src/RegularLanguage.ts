/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Case } from "effect/Data"
import type { Effect } from "effect/Effect"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { CliConfig } from "./CliConfig.js"
import * as InternalRegularLanguage from "./internal/regularLanguage.js"
import type { Primitive } from "./Primitive.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RegularLanguageTypeId: unique symbol = InternalRegularLanguage.RegularLanguageTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RegularLanguageTypeId = typeof RegularLanguageTypeId

/**
 * `RegularLanguage` is an implementation of "Parsing With Derivatives" (Might
 * et al. 2011) that is used for CLI tab completion. Unlike your usual regular
 * languages that are sets of strings of symbols, our regular languages are sets
 * of lists of tokens, where tokens can be strings or `Primitive` instances. (If
 * you think about it, `Primitive.validate` is an intensional definition of a
 * set of strings.)
 *
 * @since 1.0.0
 * @category models
 */
export type RegularLanguage =
  | Empty
  | Epsilon
  | StringToken
  | AnyStringToken
  | PrimitiveToken
  | Cat
  | Alt
  | Repeat
  | Permutation

/**
 * @since 1.0.0
 */
export declare namespace RegularLanguage {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [RegularLanguageTypeId]: (_: never) => never
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface RepetitionConfiguration {
    readonly min?: number
    readonly max?: number
  }
}

/**
 * The `Empty` language (`∅`) accepts no strings.
 *
 * @since 1.0.0
 * @category models
 */
export interface Empty extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "Empty"
}

/**
 * The `Epsilon` language (`ε`) accepts only the empty string.
 *
 * @since 1.0.0
 * @category models
 */
export interface Epsilon extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "Epsilon"
}

/**
 * A `StringToken` language represents the regular language that contains only
 * `value`.
 *
 * @since 1.0.0
 * @category models
 */
export interface StringToken extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "StringToken"
  readonly value: string
}

/**
 * `AnyStringToken` represents the set of all strings. For tab completion
 * purposes, this is used to represent the name of the executable (It may be
 * aliased or renamed to be different).
 *
 * @since 1.0.0
 * @category models
 */
export interface AnyStringToken extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "AnyStringToken"
}

/**
 * A `PrimitiveToken` language represents the regular language containing any
 * strings `s` where `value.validate(s)` succeeds.
 *
 * @since 1.0.0
 * @category models
 */
export interface PrimitiveToken extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "PrimitiveToken"
  readonly primitive: Primitive<unknown>
}

/**
 * `Cat` represents the concatenation of two regular languages.
 *
 * @since 1.0.0
 * @category models
 */
export interface Cat extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "Cat"
  readonly left: RegularLanguage
  readonly right: RegularLanguage
}

/**
 * `Alt` represents the union of two regular languages. We call it "Alt" for
 * consistency with the names used in the "Parsing With Derivatives" paper.
 *
 * @since 1.0.0
 * @category models
 */
export interface Alt extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "Alt"
  readonly left: RegularLanguage
  readonly right: RegularLanguage
}

/**
 * `Repeat` represents the repetition of `language`. The number of repetitions
 * can be bounded via `min` and `max`. Setting `max=None` represents the
 * "Kleene star" of `language`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Repeat extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "Repeat"
  readonly language: RegularLanguage
  readonly min: Option<number>
  readonly max: Option<number>
}

/**
 * Permutation is like `Cat`, but it is a commutative monoid. A
 * `Permutation(a_1, a_2, ..., a_{k})` is equivalent to the following language:
 *
 * ```
 * a2 ~ Permutation(a_1, a_3, ..., a_k) | a1 ~ Permutation(a_2, a_3, ..., a_k) | ... ak ~ Permutation(a_1, a_2, ..., a_{k - 1})
 * ```
 *
 * So when we calculate its derivative, we apply the above "desugaring"
 * transformation, then compute the derivative as usual.
 *
 * @since 1.0.0
 * @category models
 */
export interface Permutation extends RegularLanguage.Proto, Case, Pipeable {
  readonly _tag: "Permutation"
  readonly values: ReadonlyArray<RegularLanguage>
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isRegularLanguage: (u: unknown) => u is RegularLanguage =
  InternalRegularLanguage.isRegularLanguage

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEmpty: (self: RegularLanguage) => self is Empty = InternalRegularLanguage.isEmpty

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEpsilon: (self: RegularLanguage) => self is Epsilon =
  InternalRegularLanguage.isEpsilon

/**
 * @since 1.0.0
 * @category refinements
 */
export const isStringToken: (self: RegularLanguage) => self is StringToken =
  InternalRegularLanguage.isStringToken

/**
 * @since 1.0.0
 * @category refinements
 */
export const isAnyStringToken: (self: RegularLanguage) => self is AnyStringToken =
  InternalRegularLanguage.isAnyStringToken

/**
 * @since 1.0.0
 * @category refinements
 */
export const isPrimitiveToken: (self: RegularLanguage) => self is PrimitiveToken =
  InternalRegularLanguage.isPrimitiveToken

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCat: (self: RegularLanguage) => self is Cat = InternalRegularLanguage.isCat

/**
 * @since 1.0.0
 * @category refinements
 */
export const isAlt: (self: RegularLanguage) => self is Alt = InternalRegularLanguage.isAlt

/**
 * @since 1.0.0
 * @category refinements
 */
export const isRepeat: (self: RegularLanguage) => self is Repeat = InternalRegularLanguage.isRepeat

/**
 * @since 1.0.0
 * @category refinements
 */
export const isPermutation: (self: RegularLanguage) => self is Permutation =
  InternalRegularLanguage.isPermutation

/**
 * @since 1.0.0
 * @category constructors
 */
export const anyString: RegularLanguage = InternalRegularLanguage.anyString

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  (that: string | RegularLanguage): (self: RegularLanguage) => RegularLanguage
  (self: RegularLanguage, that: string | RegularLanguage): RegularLanguage
} = InternalRegularLanguage.concat

/**
 * Checks to see if the input token list is a member of the language.
 *
 * Returns `true` if and only if `tokens` is in the language.
 *
 * @since 1.0.0
 * @category combinators
 */
export const contains: {
  (
    tokens: ReadonlyArray<string>,
    config: CliConfig
  ): (self: RegularLanguage) => Effect<FileSystem, never, boolean>
  (
    self: RegularLanguage,
    tokens: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<FileSystem, never, boolean>
} = InternalRegularLanguage.contains

/**
 * Calculate the Brzozowski derivative of this language with respect to the given string. This is an effectful
 * function because it can call PrimType.validate (e.g., when validating file paths, etc.).
 *
 * @param token
 *   The string to use for calculation of the Brzozowski derivative.
 * @return
 *   Brzozowski derivative wrapped in an UIO instance.
 *
 * @since 1.0.0
 * @category combinators
 */
export const derive: {
  (
    token: string,
    config: CliConfig
  ): (self: RegularLanguage) => Effect<FileSystem, never, RegularLanguage>
  (
    self: RegularLanguage,
    token: string,
    config: CliConfig
  ): Effect<FileSystem, never, RegularLanguage>
} = InternalRegularLanguage.derive

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: RegularLanguage = InternalRegularLanguage.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const epsilon: RegularLanguage = InternalRegularLanguage.epsilon

/**
 * Returns a set consisting of the first token of all strings in this language
 * that are useful for CLI tab completion. For infinite or unwieldly languages,
 * it is perfectly fine to return the empty set: This will simply not display
 * any completions to the user.
 *
 * If you'd like the cursor to advance to the next word when tab completion
 * unambiguously matches the prefix to a token, append a space (`" "`) character
 * to the end of the returned token. Otherwise, the cursor will skip to the end
 * of the completed token in the terminal.
 *
 * Some examples of different use cases:
 *   1. Completing file/directory names:
 *      - Append a space to the ends of file names (e.g., `"bippy.pdf"`). This
 *        is because we want the cursor to jump to the next argument position if
 *        tab completion unambiguously succeeds.
 *
 *   - Do not append a space to the end of a directory name (e.g., `"foo/"`).
 *     This is because we want the user to be able to press tab again to
 *     gradually complete a lengthy file path.
 *
 *   - Append a space to the ends of string tokens.
 *
 * You may be asking why we don't try to use the `-o nospace` setting of
 * `compgen` and `complete`. The answer is they appear to be all or nothing: For
 * a given tab completion execution, you have to choose one behavior or the
 * other. This does not work well when completing both file names and directory
 * names at the same time.
 *
 * @since 1.0.0
 * @category combinators
 */
export const firstTokens = InternalRegularLanguage.firstTokens

/**
 * This is the delta (`δ`) predicate from "Parsing With Derivatives", indicating
 * whether this language contains the empty string.
 *
 * Returns `true` if and only if this language contains the empty string.
 *
 * @since 1.0.0
 * @category combinators
 */
export const isNullable: (self: RegularLanguage) => boolean = InternalRegularLanguage.isNullable

/**
 * @since 1.0.0
 * @category combinators
 */
export const optional: (self: RegularLanguage) => RegularLanguage = InternalRegularLanguage.optional

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElse: {
  (that: string | RegularLanguage): (self: RegularLanguage) => RegularLanguage
  (self: RegularLanguage, that: string | RegularLanguage): RegularLanguage
} = InternalRegularLanguage.orElse

/**
 * @since 1.0.0
 * @category constructors
 */
export const primitive: (primitive: Primitive<unknown>) => RegularLanguage =
  InternalRegularLanguage.primitive

/**
 * @since 1.0.0
 * @category constructors
 */
export const permutation: (values: ReadonlyArray<RegularLanguage>) => RegularLanguage =
  InternalRegularLanguage.permutation

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeated: {
  (
    params?: Partial<RegularLanguage.RepetitionConfiguration>
  ): (self: RegularLanguage) => RegularLanguage
  (
    self: RegularLanguage,
    params?: Partial<RegularLanguage.RepetitionConfiguration>
  ): RegularLanguage
} = InternalRegularLanguage.repeated

/**
 * @since 1.0.0
 * @category constructors
 */
export const string: (value: string) => RegularLanguage = InternalRegularLanguage.string
