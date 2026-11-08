/**
 * @title Requesting client input from MCP toolkit handlers
 *
 * Keep a tool's success schema while returning `InputRequired` for form input.
 * Modern clients resume the operation; legacy clients answer a reverse request.
 */
import { Context, Effect, Layer, Schema } from "effect"
import { McpProtocol, McpSchema, McpServer, Tool, Toolkit } from "effect/ai"

// The application supplies this service when building the registration layer.
// Closing over it avoids treating a database or backend client as per-request data.
export class ReleaseNotes extends Context.Service<ReleaseNotes, {
  readonly draft: (project: string, audience: string) => Effect.Effect<string>
}>()("docs/ReleaseNotes") {}

const tools = Toolkit.make(Tool.make("DraftReleaseNotes", {
  description: "Draft release notes after asking the user for the intended audience",
  parameters: Schema.Struct({ project: Schema.String }),
  success: Schema.String
}))

export const ReleaseTools = Layer.unwrap(Effect.gen(function*() {
  const notes = yield* ReleaseNotes
  return McpServer.toolkit(tools, {
    handlers: {
      DraftReleaseNotes: Effect.fn("DraftReleaseNotes")(function*({ project }) {
        // This service is provided automatically for each request. Authentication
        // services read here are inferred as request-level dependencies too.
        const context = yield* McpSchema.McpRequestContext
        const response = context.inputResponses?.audience
        if (response === undefined) {
          return new McpSchema.InputRequired({
            inputRequests: {
              audience: {
                method: "elicitation/create",
                params: {
                  mode: "form",
                  message: "Who will read these release notes?",
                  requestedSchema: {
                    type: "object",
                    properties: { audience: { type: "string", title: "Audience" } },
                    required: ["audience"]
                  }
                }
              }
            }
          })
        }

        // Client responses are JSON, so validate before using them. Decline and
        // cancel are ordinary user decisions; neither should perform the work.
        const answer = yield* Schema.decodeUnknownEffect(McpSchema.ElicitResult)(response).pipe(
          Effect.mapError((error) => new McpSchema.InvalidParams({ message: error.message }))
        )
        if (answer.action !== "accept") return "No draft was generated."
        const content = yield* Schema.decodeUnknownEffect(Schema.Struct({ audience: Schema.String }))(answer.content)
          .pipe(
            Effect.mapError((error) => new McpSchema.InvalidParams({ message: error.message }))
          )
        return yield* notes.draft(project, content.audience)
      })
    }
  })
}))

// A single registration supports both revisions. The caller supplies ReleaseNotes
// and its HTTP server. Missing client capabilities produce a protocol error.
export const ReleaseServer = McpServer.layerHttp({
  name: "Release Notes",
  version: "1.0.0",
  path: "/mcp",
  protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25],
  registrations: ReleaseTools
})
