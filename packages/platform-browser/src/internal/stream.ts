/**
 * @since 1.0.0
 */

import * as Stream from "effect/Stream"

/** @internal */
export const fromEventListenerWindow = <K extends keyof WindowEventMap>(
  type: K,
  options?: boolean | {
    readonly capture?: boolean
    readonly passive?: boolean
    readonly once?: boolean
    readonly bufferSize?: number | "unbounded" | undefined
  } | undefined
) => Stream.fromEventListener<WindowEventMap[K]>(window, type, options)

/** @internal */
export const fromEventListenerDocument = <K extends keyof DocumentEventMap>(
  type: K,
  options?: boolean | {
    readonly capture?: boolean
    readonly passive?: boolean
    readonly once?: boolean
    readonly bufferSize?: number | "unbounded" | undefined
  } | undefined
) => Stream.fromEventListener<DocumentEventMap[K]>(document, type, options)
