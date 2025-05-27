/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type { Simplify } from "effect/Types"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/Error")

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isPlatformError = (u: unknown): u is PlatformError => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category error
 */
export const TypeIdError = <const TypeId extends symbol, const Tag extends string>(
  typeId: TypeId,
  tag: Tag
): new<A extends Record<string, any>>(
  args: Simplify<A>
) =>
  & Cause.YieldableError
  & Record<TypeId, TypeId>
  & { readonly _tag: Tag }
  & Readonly<A> =>
{
  class Base extends Data.Error<{}> {
    readonly _tag = tag
  }
  ;(Base.prototype as any)[typeId] = typeId
  ;(Base.prototype as any).name = tag
  return Base as any
}

/**
 * @since 1.0.0
 * @category Models
 */
export const Module = Schema.Literal(
  "Clipboard",
  "Command",
  "FileSystem",
  "KeyValueStore",
  "Path",
  "Stream",
  "Terminal"
)

/**
 * @since 1.0.0
 * @category Models
 */
export class BadArgument extends Schema.TaggedError<BadArgument>("@effect/platform/Error/BadArgument")("BadArgument", {
  module: Module,
  method: Schema.String,
  description: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: typeof TypeId = TypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    return `${this.module}.${this.method}${this.description ? `: ${this.description}` : ""}`
  }
}

/**
 * @since 1.0.0
 * @category Model
 */
export const SystemErrorReason = Schema.Literal(
  "AlreadyExists",
  "BadResource",
  "Busy",
  "InvalidData",
  "NotFound",
  "PermissionDenied",
  "TimedOut",
  "UnexpectedEof",
  "Unknown",
  "WouldBlock",
  "WriteZero"
)

/**
 * @since 1.0.0
 * @category Model
 */
export type SystemErrorReason = typeof SystemErrorReason.Type

/**
 * @since 1.0.0
 * @category models
 */
export class SystemError extends Schema.TaggedError<SystemError>("@effect/platform/Error/SystemError")("SystemError", {
  reason: SystemErrorReason,
  module: Module,
  method: Schema.String,
  description: Schema.optional(Schema.String),
  syscall: Schema.optional(Schema.String),
  pathOrDescriptor: Schema.optional(Schema.Union(Schema.String, Schema.Number)),
  cause: Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: typeof TypeId = TypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    return `${this.reason}: ${this.module}.${this.method}${
      this.pathOrDescriptor !== undefined ? ` (${this.pathOrDescriptor})` : ""
    }${this.description ? `: ${this.description}` : ""}`
  }
}

/**
 * @since 1.0.0
 * @category Models
 */
export type PlatformError = BadArgument | SystemError

/**
 * @since 1.0.0
 * @category Models
 */
export const PlatformError: Schema.Union<[
  typeof BadArgument,
  typeof SystemError
]> = Schema.Union(BadArgument, SystemError)
