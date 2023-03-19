/**
 * @since 1.0.0
 */
import type { HelpDoc } from "@effect/cli/HelpDoc"
import * as internal from "@effect/cli/internal_effect_untraced/usage"
import type { Chunk } from "@effect/data/Chunk"
import type { Option } from "@effect/data/Option"

/**
 * @since 1.0.0
 * @category models
 */
export type Usage = Empty | Mixed | Named | Optional | Repeated | Alternation | Concat

/**
 * @since 1.0.0
 * @category models
 */
export interface Empty {
  readonly _tag: "Empty"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Mixed {
  readonly _tag: "Mixed"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Named {
  readonly _tag: "Named"
  readonly names: Chunk<string>
  readonly acceptedValues: Option<string>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Optional {
  readonly _tag: "Optional"
  readonly usage: Usage
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Repeated {
  readonly _tag: "Repeated"
  readonly usage: Usage
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Alternation {
  readonly _tag: "Alternation"
  readonly left: Usage
  readonly right: Usage
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Concat {
  readonly _tag: "Concat"
  readonly left: Usage
  readonly right: Usage
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const alternation: {
  (that: Usage): (self: Usage) => Usage
  (self: Usage, that: Usage): Usage
} = internal.alternation

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  (that: Usage): (self: Usage) => Usage
  (self: Usage, that: Usage): Usage
} = internal.concat

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Usage = internal.empty

/**
 * @since 1.0.0
 * @category combinators
 */
export const helpDoc: (self: Usage) => HelpDoc = internal.helpDoc

/**
 * @since 1.0.0
 * @category constructors
 */
export const mixed: Usage = internal.mixed

/**
 * @since 1.0.0
 * @category constructors
 */
export const named: (names: Chunk<string>, acceptedValues: Option<string>) => Usage = internal.named

/**
 * @since 1.0.0
 * @category combinators
 */
export const optional: (self: Usage) => Usage = internal.optional

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeated: (self: Usage) => Usage = internal.repeated
