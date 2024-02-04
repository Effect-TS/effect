import * as FileSystem from "@effect/platform/FileSystem"
import * as Effect from "effect/Effect"
import * as Ini from "ini"
import * as Toml from "toml"
import * as Yaml from "yaml"

/** @internal */
export const fileParsers: Record<string, (content: string) => unknown> = {
  json: (content: string) => JSON.parse(content),
  yaml: (content: string) => Yaml.parse(content),
  yml: (content: string) => Yaml.parse(content),
  ini: (content: string) => Ini.parse(content),
  toml: (content: string) => Toml.parse(content),
  tml: (content: string) => Toml.parse(content)
}

/** @internal */
export const read = (
  path: string
): Effect.Effect<readonly [path: string, content: Uint8Array], string, FileSystem.FileSystem> =>
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) =>
      Effect.matchEffect(fs.readFile(path), {
        onFailure: (error) => Effect.fail(`Could not read file (${path}): ${error}`),
        onSuccess: (content) => Effect.succeed([path, content] as const)
      })
  )

/** @internal */
export const readString = (
  path: string
): Effect.Effect<readonly [path: string, content: string], string, FileSystem.FileSystem> =>
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) =>
      Effect.matchEffect(fs.readFileString(path), {
        onFailure: (error) => Effect.fail(`Could not read file (${path}): ${error}`),
        onSuccess: (content) => Effect.succeed([path, content] as const)
      })
  )

/** @internal */
export const parse = (
  path: string,
  content: string,
  format?: "json" | "yaml" | "ini" | "toml"
): Effect.Effect<unknown, string> => {
  const parser = fileParsers[format ?? path.split(".").pop() as string]
  if (parser === undefined) {
    return Effect.fail(`Unsupported file format: ${format}`)
  }

  return Effect.try({
    try: () => parser(content),
    catch: (e) => `Could not parse ${format} file (${path}): ${e}`
  })
}
