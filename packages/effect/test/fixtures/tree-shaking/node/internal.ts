import * as PlatformError from "effect/PlatformError"

/** The error every implementation fails with; `marker` is a literal in each, so the bundle text shows which it carries. */
export const failure = (method: string, marker: string, pathOrDescriptor: string) => (cause: unknown) =>
  new PlatformError.PlatformError(
    new PlatformError.SystemError({
      module: "FileSystem",
      method,
      _tag: "Unknown",
      pathOrDescriptor,
      description: marker,
      cause
    })
  )
