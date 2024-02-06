/**
 * @since 1.0.0
 */
import type { Option } from "effect/Option"
import type { CliConfig } from "./CliConfig.js"
import type { HelpDoc } from "./HelpDoc.js"
import type { Span } from "./HelpDoc/Span.js"
import * as InternalUsage from "./internal/usage.js"

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
  readonly names: ReadonlyArray<string>
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
} = InternalUsage.alternation

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  (that: Usage): (self: Usage) => Usage
  (self: Usage, that: Usage): Usage
} = InternalUsage.concat

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Usage = InternalUsage.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const enumerate: {
  (config: CliConfig): (self: Usage) => Array<Span>
  (self: Usage, config: CliConfig): Array<Span>
} = InternalUsage.enumerate

/**
 * @since 1.0.0
 * @category combinators
 */
export const getHelp: (self: Usage) => HelpDoc = InternalUsage.getHelp

/**
 * @since 1.0.0
 * @category constructors
 */
export const mixed: Usage = InternalUsage.mixed

/**
 * @since 1.0.0
 * @category constructors
 */
export const named: (names: ReadonlyArray<string>, acceptedValues: Option<string>) => Usage = InternalUsage.named

/**
 * @since 1.0.0
 * @category combinators
 */
export const optional: (self: Usage) => Usage = InternalUsage.optional

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeated: (self: Usage) => Usage = InternalUsage.repeated
