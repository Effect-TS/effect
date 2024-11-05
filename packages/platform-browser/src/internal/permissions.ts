import * as PlatformError from "@effect/platform/Error"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Permissions from "../Permissions.js"

/** @internal */
export const tag = GenericTag<Permissions.Permissions>("@effect/platform-browser/Permissions")

/** @internal */
export const make = (
  impl: Permissions.Permissions
): Permissions.Permissions => tag.of(impl)

/** @internal */
export const layer = Layer.succeed(
  tag,
  make({
    query: (name) =>
      Effect.tryPromise({
        try: () => navigator.permissions.query({ name }),
        catch: () =>
          PlatformError.SystemError({
            reason: "InvalidState",
            module: "Permissions",
            "method": "query",
            "pathOrDescriptor": "layer",
            "message":
              "Browsing context and its associated document is not fully active, or the permission doesn't exist or is unsupported by the user agent."
          })
      }).pipe(
        Effect.map((status) => ({ ...status, name }))
      )
  })
)
