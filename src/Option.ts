// eslint-disable-next-line import/no-cycle
import type { None, OptionUnify, Some, TypeId } from "./impl/Option.js"
import {
  all,
  contains,
  filter,
  flatMap,
  fromNullable,
  getOrElse,
  getOrThrow,
  getOrThrowWith,
  getOrUndefined,
  getRight,
  isNone,
  isSome,
  map,
  match,
  none,
  orElse,
  some
} from "./impl/Option.js"

export * from "./impl/Option.js"
export * from "./internal/Jumpers/Option.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Option<A> = None<A> | Some<A>

export declare namespace Option {
  export type { None, OptionUnify, Some, TypeId }

  export {
    all,
    contains,
    filter,
    flatMap,
    fromNullable,
    getOrElse,
    getOrThrow,
    getOrThrowWith,
    getOrUndefined,
    getRight,
    isNone,
    isSome,
    map,
    match,
    none,
    orElse,
    some
  }
}
