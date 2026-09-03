import * as Context from "../../../Context.ts"
import type * as Fiber from "../../../Fiber.ts"
import { constFalse } from "../../../Function.ts"
import type { Predicate } from "../../../Predicate.ts"
import { TracerEnabled } from "../../../References.ts"
import type { HttpServerRequest } from "../HttpServerRequest.ts"

/** @internal */
export const TracerDisabledWhen = Context.Reference<Predicate<HttpServerRequest>>(
  "effect/http/HttpMiddleware/TracerDisabledWhen",
  { defaultValue: () => constFalse }
)

/** @internal */
export const isTracerDisabledUnsafe = (
  fiber: Fiber.Fiber<unknown, unknown>,
  request: HttpServerRequest
): boolean => !fiber.getRef(TracerEnabled) || fiber.getRef(TracerDisabledWhen)(request)
