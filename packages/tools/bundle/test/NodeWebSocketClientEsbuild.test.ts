import { assert, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))

// Returns the modules retained in the bundle output. `metafile.inputs` lists
// the whole import graph, tree-shaken or not, so read the output entry.
const bundledModules = async (contents: string): Promise<ReadonlyArray<string>> => {
  const result = await esbuild.build({
    stdin: { contents, loader: "ts", resolveDir: packageDir },
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    logLevel: "silent",
    absWorkingDir: packageDir
  })
  const [output] = Object.values(result.metafile.outputs)
  return Object.keys(output.inputs).map((input) => path.resolve(packageDir, input))
}

const isWsModule = (module: string) => /[\\/]node_modules[\\/]ws[\\/]/.test(module)

describe("Node WebSocket client bundled with esbuild", () => {
  it("does not include the ws package", { timeout: 20_000 }, async () => {
    const modules = await bundledModules(`
      import * as NodeSocket from "@effect/platform-node/NodeSocket"
      export const layer = NodeSocket.layerWebSocket("ws://localhost:1234", {
        protocols: "graphql-transport-ws",
        headers: { Authorization: "Bearer test" }
      })
    `)
    assert.isTrue(modules.some((module) => module.endsWith(path.join("socket", "Socket.ts"))))
    const wsModules = modules.filter(isWsModule)
    assert.deepStrictEqual(wsModules, [], `ws reached the client bundle: ${wsModules.join(", ")}`)
  })
})
