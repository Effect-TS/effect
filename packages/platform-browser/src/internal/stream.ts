/**
 * @since 1.0.0
 */

import * as Stream from "effect/Stream"

/** @internal */
export const fromEventListenerWindow = <K extends keyof WindowEventMap>(
  type: K,
  options?: boolean | Omit<AddEventListenerOptions, "signal">
): Stream.Stream<WindowEventMap[K]> => Stream.fromEventListener(window, type, options) as any

/** @internal */
export const fromEventListenerDocument = <K extends keyof DocumentEventMap>(
  type: K,
  options?: boolean | Omit<AddEventListenerOptions, "signal">
): Stream.Stream<DocumentEventMap[K]> => Stream.fromEventListener(document, type, options) as any
