/**
 * @since 1.0.0
 */
import type * as Data from "effect/Data"
import * as internal from "./internal/error.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const PlatformErrorTypeId: unique symbol = internal.PlatformErrorTypeId

/**
 * @since 1.0.0
 * @category type id
 */
export type PlatformErrorTypeId = typeof PlatformErrorTypeId

/**
 * @since 1.0.0
 * @category error
 */
export type PlatformError = BadArgument | SystemError

/**
 * @since 1.0.0
 */
export declare namespace PlatformError {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Base extends Data.Case {
    readonly [PlatformErrorTypeId]: typeof PlatformErrorTypeId
    readonly _tag: string
    readonly module: "Clipboard" | "Command" | "FileSystem" | "KeyValueStore" | "Path" | "Stream" | "Terminal"
    readonly method: string
    readonly message: string
  }

  /**
   * @since 1.0.0
   */
  export type ProvidedFields = PlatformErrorTypeId | "_tag" | keyof Data.Case
}

/**
 * @since 1.0.0
 * @category error
 */
export interface BadArgument extends PlatformError.Base {
  readonly _tag: "BadArgument"
}

/**
 * @since 1.0.0
 * @category error
 */
export const BadArgument: (props: Omit<BadArgument, PlatformError.ProvidedFields>) => BadArgument = internal.badArgument

/**
 * @since 1.0.0
 * @category model
 */
export type SystemErrorReason =
  | "AlreadyExists"
  | "BadResource"
  | "Busy"
  | "InvalidData"
  | "NotFound"
  | "PermissionDenied"
  | "TimedOut"
  | "UnexpectedEof"
  | "Unknown"
  | "WouldBlock"
  | "WriteZero"

/**
 * @since 1.0.0
 * @category models
 */
export interface SystemError extends PlatformError.Base {
  readonly _tag: "SystemError"
  readonly reason: SystemErrorReason
  readonly syscall?: string
  readonly pathOrDescriptor: string | number
}

/**
 * @since 1.0.0
 * @category error
 */
export const SystemError: (props: Omit<SystemError, PlatformError.ProvidedFields>) => SystemError = internal.systemError
