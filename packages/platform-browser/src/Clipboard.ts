/**
 * @since 1.0.0
 */

import type { PlatformError } from "@effect/platform/Error"
import type { Tag } from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/clipboard.js"

/**
 * @since 1.0.0
 * @category interface
 */
export interface Clipboard {
  readonly read: Effect.Effect<never, PlatformError, ClipboardItems>
  readonly readString: Effect.Effect<never, PlatformError, string>
  readonly write: (items: ClipboardItems) => Effect.Effect<never, PlatformError, void>
  readonly writeString: (text: string) => Effect.Effect<never, PlatformError, void>
  readonly writeBlob: (blob: Blob) => Effect.Effect<never, PlatformError, void>
  readonly clear: Effect.Effect<never, PlatformError, void>
}

/**
 * @since 1.0.0
 * @category constructor
 */
export const make: (
  impl: Omit<Clipboard, "clear" | "writeBlob">
) => Clipboard = internal.make

/**
 * @since 1.0.0
 * @category tag
 */
export const Clipboard: Tag<Clipboard, Clipboard> = internal.tag

/**
 * A layer that directly interfaces with the navigator.clipboard api
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<never, never, Clipboard> = internal.layer
