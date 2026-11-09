/**
 * @title Publishing MCP metadata and cache hints
 *
 * Give tools display icons and advertise freshness for public documentation
 * while retaining private, immediately stale defaults for other results.
 */
import { Effect, Layer, Schema } from "effect"
import { McpProtocol, McpSchema, McpServer, Tool, Toolkit } from "effect/ai"

// Icons describe the tool in an MCP client's UI. They do not change the
// tool's input or output schema, so the same tool can also serve an AI model.
const SearchDocs = Tool.make("SearchDocs", {
  description: "Find pages in the public documentation index",
  parameters: Schema.Struct({ query: Schema.String }),
  success: Schema.Array(Schema.String)
}).annotate(McpServer.ToolIcons, [McpSchema.Icon.make({
  src: "https://docs.example.com/search.svg",
  mimeType: "image/svg+xml",
  sizes: ["any"]
})])

const DocsToolkit = Toolkit.make(SearchDocs)
const publicPages = ["Getting started", "Authentication", "API reference"]
const ToolHandlers = DocsToolkit.toLayer({
  SearchDocs: ({ query }) =>
    Effect.succeed(publicPages.filter((page) => page.toLowerCase().includes(query.toLowerCase())))
})

// This index is identical for every caller. A shared gateway may cache it
// for one minute. For user-specific resources, retain private scope instead.
const DocsIndex = McpServer.resource({
  uri: "docs://index",
  name: "Public documentation index",
  mimeType: "text/plain",
  content: Effect.succeed(McpSchema.ReadResourceResult.make({
    contents: [{ uri: "docs://index", text: publicPages.join("\n"), mimeType: "text/plain" }],
    ttlMs: 60_000,
    cacheScope: "public"
  }))
})

export const DocsServer = McpServer.layerHttp({
  name: "public-docs",
  title: "Public Documentation",
  version: "1.0.0",
  path: "/mcp",
  protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25],
  // Public scope is appropriate because every caller sees the same tools.
  // A private cache must be isolated by authorization context, not just URI.
  cacheHints: { tools: { ttl: "1 minute", cacheScope: "public" } },
  registrations: Layer.merge(
    DocsIndex,
    McpServer.toolkit(DocsToolkit).pipe(Layer.provide(ToolHandlers))
  )
})

// Older clients receive the supported metadata without cache hints. Modern
// multi-round-trip resource retries are never cached, regardless of these hints.
