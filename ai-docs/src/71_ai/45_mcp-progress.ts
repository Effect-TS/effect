/**
 * @title Reporting progress from an MCP tool
 *
 * Report increasing progress for the calling request while processing a batch
 * of documents. The server stops progress when that request ends.
 */
import { Context, Effect, Layer, Schema } from "effect"
import { McpSchema, McpServer, Tool, Toolkit } from "effect/ai"

// Supply the application's indexing implementation when composing the server.
export class DocumentIndexer extends Context.Service<DocumentIndexer, {
  readonly index: (documentId: string) => Effect.Effect<void>
}>()("example/DocumentIndexer") {}

const IndexDocuments = Tool.make("IndexDocuments", {
  description: "Refresh the search index for selected workspace documents",
  parameters: Schema.Struct({ documentIds: Schema.Array(Schema.String) }),
  success: Schema.Number,
  dependencies: [McpSchema.McpRequestContext]
})
const IndexToolkit = Toolkit.make(IndexDocuments)

const Handlers = IndexToolkit.toLayer(Effect.gen(function*() {
  const indexer = yield* DocumentIndexer
  const server = yield* McpServer.McpServer
  return {
    IndexDocuments: Effect.fnUntraced(function*({ documentIds }) {
      // Read request context inside the handler: registrations are shared by clients.
      const request = yield* McpSchema.McpRequestContext
      const token = request.requestMetadata?.progressToken
      for (let index = 0; index < documentIds.length; index++) {
        yield* indexer.index(documentIds[index])
        // Clients opt in by sending a progress token. Each value must increase.
        if (typeof token === "string" || typeof token === "number") {
          yield* server.notifications["notifications/progress"]({
            progressToken: token,
            progress: index + 1,
            total: documentIds.length,
            message: "Updating the document search index"
          })
        }
      }
      return documentIds.length
    })
  }
}))

// Pass this layer as the server's `registrations` and provide DocumentIndexer.
// Await progress writes in the handler so notifications precede its final result.
export const IndexingTools = McpServer.toolkit(IndexToolkit).pipe(Layer.provide(Handlers))
