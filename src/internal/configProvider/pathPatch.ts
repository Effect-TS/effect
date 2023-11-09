import type { ConfigError } from "../../exports/ConfigError.js"
import type { PathPatch } from "../../exports/ConfigProviderPathPatch.js"
import { Either } from "../../exports/Either.js"
import { dual, pipe } from "../../exports/Function.js"
import { List } from "../../exports/List.js"
import { Option } from "../../exports/Option.js"
import { ReadonlyArray as RA } from "../../exports/ReadonlyArray.js"
import * as configError from "../configError.js"

/** @internal */
export const empty: PathPatch = {
  _tag: "Empty"
}

/** @internal */
export const andThen = dual<
  (that: PathPatch) => (self: PathPatch) => PathPatch,
  (self: PathPatch, that: PathPatch) => PathPatch
>(2, (self, that) => ({
  _tag: "AndThen",
  first: self,
  second: that
}))

/** @internal */
export const mapName = dual<
  (f: (string: string) => string) => (self: PathPatch) => PathPatch,
  (self: PathPatch, f: (string: string) => string) => PathPatch
>(2, (self, f) => andThen(self, { _tag: "MapName", f }))

/** @internal */
export const nested = dual<
  (name: string) => (self: PathPatch) => PathPatch,
  (self: PathPatch, name: string) => PathPatch
>(2, (self, name) => andThen(self, { _tag: "Nested", name }))

/** @internal */
export const unnested = dual<
  (name: string) => (self: PathPatch) => PathPatch,
  (self: PathPatch, name: string) => PathPatch
>(2, (self, name) => andThen(self, { _tag: "Unnested", name }))

/** @internal */
export const patch = dual<
  (
    patch: PathPatch
  ) => (
    path: ReadonlyArray<string>
  ) => Either<ConfigError, ReadonlyArray<string>>,
  (
    path: ReadonlyArray<string>,
    patch: PathPatch
  ) => Either<ConfigError, ReadonlyArray<string>>
>(2, (path, patch) => {
  let input: List<PathPatch> = List.of(patch)
  let output: ReadonlyArray<string> = path
  while (List.isCons(input)) {
    const patch: PathPatch = input.head
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
