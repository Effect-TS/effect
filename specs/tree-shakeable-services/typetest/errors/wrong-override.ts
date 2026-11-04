// Overrides are typed as the shape: a wrong parameter type and an added requirement are both rejected.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as FileSystem from "../../src/FileSystem.ts"

const Other = Context.Service<{ readonly value: number }>("test/Other")

export const wrongParameter = Layer.succeed(
  FileSystem.readFile.service,
  (path: number) => Effect.succeed(new Uint8Array([path]))
)

export const addsRequirement = Layer.succeed(
  FileSystem.readFile.service,
  (path) => Effect.map(Other, (other) => new Uint8Array([other.value, path.length]))
)
