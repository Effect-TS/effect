// eslint-disable-next-line import/no-cycle
import type { None, OptionUnify, Some, TypeId } from "./impl/Option.js"
import type * as bla from "./impl/Option.js"

export * from "./impl/Option.js"
export * from "./internal/Jumpers/Option.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Option<A> = None<A> | Some<A>

export declare namespace Option {
  const isSome: typeof bla.isSome
  const isNone: typeof bla.isNone
  const some: typeof bla.some
  const none: typeof bla.none
  const getOrElse: typeof bla.getOrElse
  const fromNullable: typeof bla.fromNullable
  const match: typeof bla.match
  const map: typeof bla.map
  const filter: typeof bla.filter
  const getOrUndefined: typeof bla.getOrUndefined
  const getRight: typeof bla.getRight
  const flatMap: typeof bla.flatMap
  const orElse: typeof bla.orElse
  const all: typeof bla.all
  const contains: typeof bla.contains
  const getOrThrow: typeof bla.getOrThrow
  const getOrThrowWith: typeof bla.getOrThrowWith
  // TODO: the rest
}

export declare namespace Option {
  export type { None, OptionUnify, Some, TypeId }
}
