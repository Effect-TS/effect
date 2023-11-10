/**
 * @since 2.0.0
 */
import type { None, Some } from "./impl/Option.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Option.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Option.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Option<A> = None<A> | Some<A>

/**
 * @since 2.0.0
 */
export declare namespace Option {
  // opt1: much more convenient of course, but while it works, the compiler gives an error
  // @ts-expect-error
  export type * from "./impl/Option.js"

  // opt2: have to manually (or automate process) these exports
  // much less convenient, but it doesn't require silencing compiler
  // export type { None, OptionUnify, Some, TypeId }

  // export {
  //   all,
  //   contains,
  //   filter,
  //   flatMap,
  //   fromNullable,
  //   getOrElse,
  //   getOrThrow,
  //   getOrThrowWith,
  //   getOrUndefined,
  //   getRight,
  //   isNone,
  //   isSome,
  //   map,
  //   match,
  //   none,
  //   orElse,
  //   some
  //   // TODO: all the rest
  // }
}
