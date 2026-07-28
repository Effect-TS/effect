import type { SystemError, SystemErrorTag } from "effect/PlatformError"
import * as PlatformError from "effect/PlatformError"

interface DenoError {
  readonly code?: unknown
  readonly name?: unknown
}

export const handleError = (
  module: SystemError["module"],
  method: string,
  pathOrDescriptor?: string | number
) =>
(error: unknown): PlatformError.PlatformError => {
  const denoError = error as DenoError
  let tag: SystemErrorTag = "Unknown"

  if (denoError?.name === "NotCapable") {
    tag = "PermissionDenied"
  } else {
    switch (denoError?.code) {
      case "ENOENT":
        tag = "NotFound"
        break

      case "EACCES":
        tag = "PermissionDenied"
        break

      case "EEXIST":
        tag = "AlreadyExists"
        break

      case "EISDIR":
      case "ENOTDIR":
      case "ELOOP":
        tag = "BadResource"
        break

      case "EBUSY":
        tag = "Busy"
        break
    }
  }

  return PlatformError.systemError({
    _tag: tag,
    module,
    method,
    pathOrDescriptor,
    cause: error
  })
}
