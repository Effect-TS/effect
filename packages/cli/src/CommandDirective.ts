/**
 * @since 1.0.0
 */
import type { BuiltInOptions } from "./BuiltInOptions.js"
import * as InternalCommandDirective from "./internal/commandDirective.js"

/**
 * @since 1.0.0
 * @category models
 */
export type CommandDirective<A> = BuiltIn | UserDefined<A>

/**
 * @since 1.0.0
 * @category models
 */
export interface BuiltIn {
  readonly _tag: "BuiltIn"
  readonly option: BuiltInOptions
}

/**
 * @since 1.0.0
 * @category models
 */
export interface UserDefined<A> {
  readonly _tag: "UserDefined"
  readonly leftover: ReadonlyArray<string>
  readonly value: A
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const builtIn: (option: BuiltInOptions) => CommandDirective<never> = InternalCommandDirective.builtIn

/**
 * @since 1.0.0
 * @category refinements
 */
export const isBuiltIn: <A>(self: CommandDirective<A>) => self is BuiltIn = InternalCommandDirective.isBuiltIn

/**
 * @since 1.0.0
 * @category refinements
 */
export const isUserDefined: <A>(self: CommandDirective<A>) => self is UserDefined<A> =
  InternalCommandDirective.isUserDefined

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: CommandDirective<A>) => CommandDirective<B>
  <A, B>(self: CommandDirective<A>, f: (a: A) => B): CommandDirective<B>
} = InternalCommandDirective.map

/**
 * @since 1.0.0
 * @category constructors
 */
export const userDefined: <A>(leftover: ReadonlyArray<string>, value: A) => CommandDirective<A> =
  InternalCommandDirective.userDefined
