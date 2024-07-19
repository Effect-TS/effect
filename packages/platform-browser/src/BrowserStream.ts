/**
 * @since 1.0.0
 */

import type * as Stream from "effect/Stream"
import * as internal from "./internal/stream.js"

/**
 * Creates a `Stream` from window.addEventListener.
 * @since 1.0.0
 */
export const fromEventListenerWindow: <K extends keyof WindowEventMap>(
  type: K,
  options?: boolean | {
    readonly capture?: boolean
    readonly passive?: boolean
    readonly once?: boolean
    readonly bufferSize?: number | "unbounded" | undefined
  } | undefined
) => Stream.Stream<WindowEventMap[K], never, never> = internal.fromEventListenerWindow

/**
 * Creates a `Stream` from document.addEventListener.
 * @since 1.0.0
 */
export const fromEventListenerDocument: <K extends keyof DocumentEventMap>(
  type: K,
  options?: boolean | {
    readonly capture?: boolean
    readonly passive?: boolean
    readonly once?: boolean
    readonly bufferSize?: number | "unbounded" | undefined
  } | undefined
) => Stream.Stream<DocumentEventMap[K], never, never> = internal.fromEventListenerDocument
