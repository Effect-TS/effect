/**
 * @since 1.0.0
 */

import * as Stream from "effect/Stream"

/** @internal */
export const fromEventListenerWindow = <K extends keyof WindowEventMap>(
  type: K,
  options?: boolean | Omit<AddEventListenerOptions, "signal">
) => Stream.fromEventListener<WindowEventMap[K]>(window, type, options)

/** @internal */
export const fromEventListenerDocument = <K extends keyof DocumentEventMap>(
  type: K,
  options?: boolean | Omit<AddEventListenerOptions, "signal">
) => Stream.fromEventListener<DocumentEventMap[K]>(document, type, options)
