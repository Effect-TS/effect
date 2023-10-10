/**
 * @since 1.0.0
 */
import type { BuiltInOption } from "./BuiltInOption"
import * as internal from "./internal/commandDirective"

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
  readonly option: BuiltInOption
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
export const builtIn: (option: BuiltInOption) => CommandDirective<never> = internal.builtIn

/**
 * @since 1.0.0
 * @category refinements
 */
export const isBuiltIn: <A>(self: CommandDirective<A>) => self is BuiltIn = internal.isBuiltIn

/**
 * @since 1.0.0
 * @category refinements
 */
export const isUserDefined: <A>(self: CommandDirective<A>) => self is UserDefined<A> = internal.isUserDefined

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: CommandDirective<A>) => CommandDirective<B>
  <A, B>(self: CommandDirective<A>, f: (a: A) => B): CommandDirective<B>
} = internal.map

/**
 * @since 1.0.0
 * @category constructors
 */
export const userDefined: <A>(leftover: ReadonlyArray<string>, value: A) => CommandDirective<A> = internal.userDefined
