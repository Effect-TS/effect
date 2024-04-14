/**
 * @since 1.0.0
 */

import type * as Stream from "effect/Stream"
import * as internal from "./internal/stream.js"

/**
 * Creates a `Stream` from window.addEventListener.
 * @since 1.0.0
 * @example
 *
 * import { BrowserStream } from "@effect/platform-browser";
 * BrowserStream.fromWindowEventListener("keypress") // Stream<KeyboardEvent>
 */
export const fromWindowEventListener: <K extends keyof WindowEventMap>(
  type: K,
  options?: boolean | Omit<AddEventListenerOptions, "signal">
) => Stream.Stream<WindowEventMap[K]> = internal.fromWindowEventListener

/**
 * Creates a `Stream` from document.addEventListener.
 * @since 1.0.0
 */
export const fromDocumentEventListener: <K extends keyof DocumentEventMap>(
  type: K,
  options?: boolean | Omit<AddEventListenerOptions, "signal">
) => Stream.Stream<DocumentEventMap[K]> = internal.fromDocumentEventListener
