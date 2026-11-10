# Reproduce the scoped ReasoningFormat import

This one-off maintenance procedure updates only the ReasoningFormat type and schema in
src/Generated.ts. It does not replace codegen.yml or regenerate the client. Use the
repository generator and lockfile from this change (parent revision a4243aa8f3).

The input is OpenRouterTeam/typescript-sdk at immutable commit
14b55ce2b112905ba3da84950d5f737ae2b79208, .speakeasy/in.openapi.yaml.
The SDK is Apache-2.0 (see LICENSE.md at that revision, copyright 2025 OpenRouter Inc.).
Only protocol enum names and nullability are imported; no SDK implementation,
descriptions, examples, or spec file are redistributed. The generated Effect code
remains under this repository’s MIT license.

From the repository root, run `nix develop -c pnpm install`, then save the following
as `scratchpad/openrouter-reasoning-format.ts`:

```ts
import { NodeServices } from "@effect/platform-node"
import { Effect } from "effect"
import { FetchHttpClient } from "effect/http"
import { readFile, writeFile } from "node:fs/promises"
import { CodegenConfig, SpecSource } from "../packages/tools/ai-codegen/src/Config.ts"
import * as Generator from "../packages/tools/ai-codegen/src/Generator.ts"
import * as SpecFetcher from "../packages/tools/ai-codegen/src/SpecFetcher.ts"

const url =
  "https://raw.githubusercontent.com/OpenRouterTeam/typescript-sdk/14b55ce2b112905ba3da84950d5f737ae2b79208/.speakeasy/in.openapi.yaml"
const path = "packages/ai/openrouter/src/Generated.ts"
const specSource = SpecSource.Url(url)
const generated = await Effect.runPromise(
  Effect.gen(function*() {
    const spec = yield* (yield* SpecFetcher.SpecFetcher).fetch(specSource, "openrouter")
    return yield* (yield* Generator.CodeGenerator).generate({
      name: "openrouter",
      packagePath: "packages/ai/openrouter",
      outputPath: path,
      specSource,
      config: new CodegenConfig({
        spec: url,
        output: path,
        includePaths: [],
        includeSchemas: ["ReasoningFormat"],
        excludeAnnotations: ["default", "examples"]
      })
    }, spec)
  }).pipe(
    Effect.provide(Generator.layerSchema),
    Effect.provide(SpecFetcher.layer),
    Effect.provide(FetchHttpClient.layer),
    Effect.provide(NodeServices.layer)
  )
)
const current = await readFile(path, "utf8")
const extract = (text: string) => {
  const start = text.indexOf("export type ReasoningFormat =")
  const schema = text.indexOf("export const ReasoningFormat =", start)
  const identifier = text.indexOf("\"identifier\": \"ReasoningFormat\"", schema)
  const end = text.indexOf("})", identifier) + 2
  if (start < 0 || schema < 0 || identifier < 0 || end < 2) {
    throw new Error("Missing ReasoningFormat declarations")
  }
  const block = text.slice(start, end)
  if (block.split("export ").length !== 3 || text.indexOf("export type ReasoningFormat =", end) !== -1) {
    throw new Error("Expected exactly the ReasoningFormat type and schema")
  }
  return block
}
await writeFile(path, current.replace(extract(current), extract(generated)))
```

Run:

```sh
nix develop -c node scratchpad/openrouter-reasoning-format.ts
nix develop -c pnpm exec dprint fmt packages/ai/openrouter/src/Generated.ts
```

The generator includes no paths and only ReasoningFormat. Excluding default and
examples preserves the existing block’s annotation policy. The guarded import
replaces exactly two declarations; inspect the diff to confirm all other declarations
and codegen.yml remain untouched. Schema.Literals grouping is the existing generator’s
output, not an additional enum-policy change.

Repeat both commands and verify the formatted Generated.ts is byte-identical.
Then run the focused Generated.test.ts, pnpm lint-fix, and pnpm check through
nix develop -c. Remove the scratchpad file when finished.
