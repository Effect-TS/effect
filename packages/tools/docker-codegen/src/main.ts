/**
 * Regenerates `effect/docker/DockerSchema` from the pinned Docker Engine API
 * document.
 *
 * The pipeline:
 *
 * 1. fetch moby's Swagger 2.0 YAML for the pinned version, and parse it;
 * 2. convert it to OpenAPI 3.0 with swagger2openapi;
 * 3. apply the hand-written patches from `codegen.yaml`, then the computed
 *    patch families (`Patches.standing`);
 * 4. generate a Schema for every `components.schemas` entry, write the file and
 *    format it with dprint;
 * 5. write the manifest of the document's operations (`Manifest`), which
 *    `effect/docker`'s conformance test checks `DockerApi` against.
 *
 * Run it on purpose, never during the build:
 *
 * ```sh
 * node packages/tools/docker-codegen/src/bin.ts
 * ```
 *
 * @since 4.0.6
 */
import * as OpenApiPatch from "@effect/openapi-generator/OpenApiPatch"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Yaml from "effect/encoding/Yaml"
import * as FileSystem from "effect/FileSystem"
import * as HttpClient from "effect/http/HttpClient"
import * as JsonPatch from "effect/JsonPatch"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import SwaggerToOpenApi from "swagger2openapi"
import { CodegenConfig } from "./Config.ts"
import * as Generate from "./Generate.ts"
import * as Manifest from "./Manifest.ts"
import * as Patches from "./Patches.ts"

const configFile = new URL("../codegen.yaml", import.meta.url)

const SwaggerInfo = Schema.Struct({
  swagger: Schema.Literal("2.0"),
  info: Schema.Struct({ version: Schema.String })
})

const fetchSpec = Effect.fn("fetchSpec")(function*(url: string, version: string) {
  const text = yield* HttpClient.get(url).pipe(
    Effect.flatMap((response) => response.text)
  )
  const swagger = Yaml.parse(text) as unknown
  const { info } = yield* Schema.decodeUnknownEffect(SwaggerInfo)(swagger)
  if (info.version !== version) {
    return yield* Effect.die(new Error(`${url} is API ${info.version}, expected ${version}`))
  }
  const openapi = yield* Effect.promise(() =>
    SwaggerToOpenApi.convertObj(swagger as any, { laxDefaults: true, laxurls: true, patch: true, warnOnly: true })
  )
  return openapi.openapi as unknown as Patches.Node
})

const applyPatch = (document: Patches.Node, name: string, patch: JsonPatch.JsonPatch): Patches.Node => {
  try {
    return JsonPatch.apply(patch, document as Schema.Json) as Patches.Node
  } catch (cause) {
    throw new Error(`Patch ${name} failed: ${String(cause)}`, { cause })
  }
}

/**
 * Writes `source` to `output`, formatted with dprint. dprint skips paths below
 * dot-directories, so it formats stdin; only on success, because a failing
 * `pnpm` prints its error on stdout.
 */
const writeFormatted = Effect.fnUntraced(function*(output: string, source: string, cwd: string) {
  const fs = yield* FileSystem.FileSystem
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  yield* fs.writeFileString(output, source)
  const [formatted, exitCode] = yield* Effect.scoped(Effect.flatMap(
    spawner.spawn(ChildProcess.make("pnpm", ["exec", "dprint", "fmt", "--stdin", output], {
      stdin: Stream.make(new TextEncoder().encode(source)),
      cwd
    })),
    (handle) => Effect.all([Stream.mkString(Stream.decodeText(handle.stdout)), handle.exitCode], { concurrency: 2 })
  ))
  if (exitCode !== 0) {
    return yield* Effect.die(new Error(`dprint exited with ${exitCode}:\n${formatted}`))
  }
  yield* fs.writeFileString(output, formatted)
})

/**
 * Runs the codegen pipeline.
 *
 * @category entry points
 * @since 4.0.6
 */
export const run = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const configPath = yield* path.fromFileUrl(configFile)
  const config = yield* fs.readFileString(configPath).pipe(
    Effect.map((text) => Yaml.parse(text) as unknown),
    Effect.flatMap(Schema.decodeUnknownEffect(CodegenConfig, { onExcessProperty: "error" }))
  )

  yield* Console.log(`Fetching API ${config.apiVersion}`)
  const document = yield* fetchSpec(config.spec, config.apiVersion)

  // the hand-written patches first, so the computed families also cover what they add
  let patched = document
  for (const [i, input] of config.patches.entries()) {
    const patch = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(OpenApiPatch.JsonPatchDocument))(input)
    patched = applyPatch(patched, `codegen.yaml patches[${i}]`, patch)
  }
  for (const family of Patches.standing) {
    const patch = family.make(patched)
    yield* Console.log(`Patch family ${family.name}: ${patch.length} operations`)
    patched = applyPatch(patched, family.name, patch)
  }

  const output = path.resolve(path.dirname(configPath), config.output)
  yield* writeFormatted(output, Generate.generate(patched, config), path.dirname(configPath))
  yield* Console.log(`Wrote ${output}`)

  const manifest = path.resolve(path.dirname(configPath), config.manifest)
  const operations = Manifest.make(patched, { apiVersion: config.apiVersion, spec: config.spec })
  yield* writeFormatted(manifest, JSON.stringify(operations, null, 2) + "\n", path.dirname(configPath))
  yield* Console.log(`Wrote ${manifest}`)
})
