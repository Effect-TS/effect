import type * as Otel from "@opentelemetry/api"
import type { Tag } from "effect/Context"
import * as internal from "./internal/tracer.js"

/**
 * @since 1.0.0
 * @category tags
 */

export const TracerProvider: Tag<"Otel/TracerProvider", Otel.TracerProvider> = internal.TracerProvider
