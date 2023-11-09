import type * as ConfigError from "../../ConfigError.js"
import type * as PathPatch from "../../ConfigProviderPathPatch.js"
import * as Either from "../../Either.js"
import { dual, pipe } from "../../Function.js"
import * as List from "../../List.js"
import * as Option from "../../Option.js"
import * as RA from "../../ReadonlyArray.js"
import * as configError from "../configError.js"

/** @internal */
export const empty: PathPatch.ConfigProviderPathPatch = {
  _tag: "Empty"
}

/** @internal */
export const andThen = dual<
  (
    that: PathPatch.ConfigProviderPathPatch
  ) => (self: PathPatch.ConfigProviderPathPatch) => PathPatch.ConfigProviderPathPatch,
  (
    self: PathPatch.ConfigProviderPathPatch,
    that: PathPatch.ConfigProviderPathPatch
  ) => PathPatch.ConfigProviderPathPatch
>(2, (self, that) => ({
  _tag: "AndThen",
  first: self,
  second: that
}))

/** @internal */
export const mapName = dual<
  (f: (string: string) => string) => (self: PathPatch.ConfigProviderPathPatch) => PathPatch.ConfigProviderPathPatch,
  (self: PathPatch.ConfigProviderPathPatch, f: (string: string) => string) => PathPatch.ConfigProviderPathPatch
>(2, (self, f) => andThen(self, { _tag: "MapName", f }))

/** @internal */
export const nested = dual<
  (name: string) => (self: PathPatch.ConfigProviderPathPatch) => PathPatch.ConfigProviderPathPatch,
  (self: PathPatch.ConfigProviderPathPatch, name: string) => PathPatch.ConfigProviderPathPatch
>(2, (self, name) => andThen(self, { _tag: "Nested", name }))

/** @internal */
export const unnested = dual<
  (name: string) => (self: PathPatch.ConfigProviderPathPatch) => PathPatch.ConfigProviderPathPatch,
  (self: PathPatch.ConfigProviderPathPatch, name: string) => PathPatch.ConfigProviderPathPatch
>(2, (self, name) => andThen(self, { _tag: "Unnested", name }))

/** @internal */
export const patch = dual<
  (
    patch: PathPatch.ConfigProviderPathPatch
  ) => (
    path: ReadonlyArray<string>
  ) => Either.Either<ConfigError.ConfigError, ReadonlyArray<string>>,
  (
    path: ReadonlyArray<string>,
    patch: PathPatch.ConfigProviderPathPatch
  ) => Either.Either<ConfigError.ConfigError, ReadonlyArray<string>>
>(2, (path, patch) => {
  let input: List.List<PathPatch.ConfigProviderPathPatch> = List.of(patch)
  let output: ReadonlyArray<string> = path
  while (List.isCons(input)) {
    const patch: PathPatch.ConfigProviderPathPatch = input.head
    switch (patch._tag) {
      case "Empty": {
        input = input.tail
        break
      }
      case "AndThen": {
        input = List.cons(patch.first, List.cons(patch.second, input.tail))
        break
      }
      case "MapName": {
        output = RA.map(output, patch.f)
        input = input.tail
        break
      }
      case "Nested": {
        output = RA.prepend(output, patch.name)
        input = input.tail
        break
      }
      case "Unnested": {
        const containsName = pipe(
          RA.head(output),
          Option.contains(patch.name)
        )
        if (containsName) {
          output = RA.tailNonEmpty(output as RA.NonEmptyArray<string>)
          input = input.tail
        } else {
          return Either.left(configError.MissingData(
            output,
            `Expected ${patch.name} to be in path in ConfigProvider#unnested`
          ))
        }
        break
      }
    }
  }
  return Either.right(output)
})
