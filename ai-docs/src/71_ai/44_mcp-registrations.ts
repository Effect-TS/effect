/**
 * @title Updating MCP resources while the server runs
 *
 * Reflect a workspace's changing document catalog in an MCP server, including
 * resources discovered after clients connect.
 */
import { Context, Effect, Layer, Stream } from "effect"
import { McpProtocol, McpServer } from "effect/ai"

// A workspace index supplies an initial snapshot as Upsert events, followed by
// live changes. Its implementation owns filesystem watching or database access.
type DocumentChange =
  | { readonly _tag: "Upsert"; readonly uri: string; readonly name: string; readonly text: string }
  | { readonly _tag: "Remove"; readonly uri: string }

export class WorkspaceCatalog extends Context.Service<WorkspaceCatalog, {
  readonly changes: Stream.Stream<DocumentChange>
}>()("workspace/WorkspaceCatalog") {}

const CatalogRegistrations = Layer.effectDiscard(Effect.gen(function*() {
  const catalog = yield* WorkspaceCatalog
  const server = yield* McpServer.McpServer

  // The catalog updates sequentially. Registering the same URI replaces its
  // previous content; removing an absent URI is harmless and returns false.
  yield* catalog.changes.pipe(
    Stream.runForEach((change) =>
      change._tag === "Remove"
        ? server.removeResource(change.uri)
        : McpServer.registerResource({
          uri: change.uri,
          name: change.name,
          mimeType: "text/plain",
          content: Effect.succeed(change.text)
        })
    ),
    // The watcher runs for the server layer's lifetime. The explicit Remove
    // events withdraw resources; completing this stream does not remove them.
    Effect.forkScoped
  )
}))

// Declare resources before the first asynchronous catalog update. Legacy
// initialize responses advertise them immediately, and modern clients can
// subscribe to resource list changes while the catalog is still empty.
export const WorkspaceServer = McpServer.layerStdio({
  name: "Workspace Documents",
  version: "1.0.0",
  protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25],
  declaredFeatures: ["resources"],
  registrations: CatalogRegistrations
})

// Provide WorkspaceCatalog and the platform Stdio layer at the entry point.
// Additions, replacements and removals notify connected clients automatically;
// an already-running read can finish even after its resource is removed.
