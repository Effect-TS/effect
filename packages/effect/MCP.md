## Introduction

The `McpServer.ts` module provides an implementation of an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/docs/getting-started/intro) server using the
[Effect](https://effect.website) eco system.

## Getting Started

It's important to understand the architecture of the Effect MCP server.
Here is an example of a MCP server implementation:

```typescript
import { NodeRuntime, NodeStdio } from "@effect/platform-node"
import { Effect, Layer, Logger, Schema } from "effect"
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/ai"

// Define a simple tool
const DemoTool = Tool.make("DemoTool", {
  description: "A demo tool that echoes back the input",
  parameters: Schema.Struct({
    message: Schema.String
  }),
  success: Schema.String
})

const MyToolkit = Toolkit.make(DemoTool)

const DemoResource = McpServer.resource({
  uri: "file:///demo.txt",
  name: "Demo Resource",
  content: Effect.succeed("# Demo Content\nThis is a demo resource.")
})

const DemoPrompt = McpServer.prompt({
  name: "Demo Prompt",
  description: "A demo prompt",
  parameters: {
    topic: Schema.String
  },
  completion: {
    topic: () => Effect.succeed(["AI", "programming", "Effect"])
  },
  content: ({ topic }) => Effect.succeed(`Tell me about ${topic}`)
})

const ServerLayer = Layer.mergeAll(
  DemoResource,
  DemoPrompt,
  McpServer.toolkit(MyToolkit).pipe(
    Layer.provideMerge(
      MyToolkit.toLayer({
        DemoTool: ({ message }) => Effect.succeed(`Echo: ${message}`)
      })
    )
  )
).pipe(
  Layer.provide(
    McpServer.layerStdio({
      name: "Demo MCP Server",
      version: "1.0.0",
      protocols: [McpProtocol.v2025_06_18]
    })
  ),
  Layer.provide(NodeStdio.layer),
  Layer.provide(Logger.layer([Logger.consolePretty()])),
  Layer.provideMerge(Layer.succeed(Logger.LogToStderr, true))
)

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
```

The server exposes three main parts:

- **`Resource`**, which represents a readable MCP resource such as a file accessible to the client
- **`Prompt`**, which defines a prompt template that can be used by the client and should not be
  confused with `Prompt.ts`
- **`ToolkitLayer`**, which contains the definitions of all tools the server exposes, provided with
  their implementations through `ToolImplLayer`.

The part layers are merged into one layer that has a MCP server implementation as dependency.
`McpServer.layerStdio` is used to create a standard I/O–based MCP server identified by its name and
version. Its ordered, non-empty `protocols` declaration names implemented protocol adapters rather
than arbitrary version strings. This release supports `McpProtocol.v2024_11_05`,
`McpProtocol.v2025_03_26`, and `McpProtocol.v2025_06_18`. The `v2024_11_05` adapter implements that
revision's RPC schemas and stdio framing, including its batch policy. It does not implement the
historical two-endpoint HTTP+SSE transport. `McpServer.layerHttp` instead offers the 2024 RPC schema
through the same single-endpoint HTTP compatibility transport used by the 2025 adapters. Because of
the layer architecture the server implementation can be easily exchanged with this HTTP-based
implementation. Finally, a logging layer is added with
`Logger.layer([Logger.consolePretty({ stderr: true })])`, ensuring logs are written to `stderr`.
This is essential when using stdio, as any output to `stdout` would interfere with the protocol
communication.

## Resources

Resources in the MCP server represent files or data that can be accessed by an MCP client. Each
resource is defined as a template that specifies its location, behavior, and metadata. The
`McpServer.resource` helper allows you to declaratively define such resources with dynamic
parameters, completions, and content generation.

```typescript
import { Effect, Schema } from "effect"
import { McpSchema, McpServer } from "effect/ai"

const SimpleResource = McpServer.resource({
  uri: "file:///demo.txt",
  name: "Demo Resource",
  description: "A simple demo resource",
  mimeType: "text/plain",
  content: Effect.succeed("This is demo content")
})

const idParam = McpSchema.param("id", Schema.NumberFromString)

const TemplateResource = McpServer.resource`file://path/to/file/${idParam}`({
  name: "Demo Resource Template",
  description: "A parameterized resource template",
  completion: {
    id: (_: string) => Effect.succeed([1, 2, 3, 4, 5])
  },
  content: Effect.fn(function*(_uri, id) {
    return `# MCP Server Demo - ID: ${id}`
  }),
  mimeType: "text/x-markdown",
  audience: ["assistant", "user"]
})
```

In this example, the resource is parameterized by an `id` that forms part of the URI. The
`completion` function enables clients to request valid parameter values dynamically. The `content`
function defines how the resource's data is generated at runtime—in this case, returning a Markdown
string containing the provided `id`. The `mimeType` specifies the format of the resource, while the
`audience` property determines who can access it (either `"assistant"` and/or `"user"`).

## Prompts

Prompts define reusable templates that an MCP client can invoke with parameters. They serve as
structured, parameterized instructions or messages that the client can send to the server. Using
`McpServer.prompt`, you can describe the prompt's schema, auto-completion behavior, and content
generation logic in a declarative way.

```typescript
import { Effect, Schema } from "effect"
import { McpServer } from "effect/ai"

const DemoPrompt = McpServer.prompt({
  name: "Demo Prompt",
  description: "A demo prompt to demonstrate MCP server capabilities",
  parameters: {
    name: Schema.String
  },
  completion: {
    name: () => Effect.succeed(["Tom", "Tim", "Jerry"])
  },
  content: ({ name }) => Effect.succeed(`Use the greetings tool to write a greeting for ${name}.`)
})
```

In this example, the prompt defines a single parameter, `name`. The `completion` property provides
an auto-completion mechanism, allowing the client to suggest or autofill common names. The `content`
function then generates the actual prompt text dynamically based on the provided parameter.

## Tools and Toolkit

Tools define executable capabilities that the MCP server exposes to clients. Each tool describes a
contract while the actual logic is provided separately through an implementation layer. Tools are
grouped into toolkits, which can be combined and converted into layers.

```typescript
import { Effect, Layer, Schema } from "effect"
import { McpServer, Tool, Toolkit } from "effect/ai"

const DemoTool = Tool.make("DemoTool", {
  description: "This is a demo tool for the documentation",
  parameters: Schema.Struct({
    demoId: Schema.Number,
    demoName: Schema.String
  }),
  success: Schema.String
})

const OtherDemoTool = Tool.make("OtherDemoTool", {
  description: "Another demo tool",
  parameters: Schema.Struct({
    value: Schema.Number
  }),
  success: Schema.String
})

const MyToolkit = Toolkit.make(DemoTool, OtherDemoTool)

const ToolkitLayer = McpServer.toolkit(MyToolkit).pipe(
  Layer.provideMerge(
    MyToolkit.toLayer({
      DemoTool: ({ demoId, demoName }) => Effect.succeed(`Processed ${demoName} with ID ${demoId}`),
      OtherDemoTool: ({ value }) => Effect.succeed(`Other tool result: ${value * 2}`)
    })
  )
)
```

In this example, `Tool.make` defines new tools with typed parameters and result schemas for success
outcomes. Multiple tools can be grouped into a single `Toolkit` using `Toolkit.make`.

The toolkit is then transformed into a layer defining the interface of the tools using
`McpServer.toolkit()`. The corresponding implementations are attached using `.toLayer`, which binds
each tool definition to its concrete logic. Finally, the completed toolkit layer can be merged with
other layers to create the MCP server.

## Elicitation requests

Elicitation requests are used to request additional input directly from the user. An elicitation
defines both the message shown to the user and the expected response schema, ensuring structured and
validated user input.

```typescript
import { Effect, Schema } from "effect"
import { McpServer } from "effect/ai"

const DemoElicitation = McpServer.elicit({
  message: `Please answer the question ("yes" | "no") (default "no"):`,
  schema: Schema.Struct({
    answer: Schema.Union([Schema.Literal("yes"), Schema.Literal("no")])
  })
}).pipe(
  Effect.catchTag("ElicitationDeclined", (_error) => {
    return Effect.succeed({ answer: "no" })
  })
)
```

In this example, the server poses a simple yes/no question to the user. The input is validated
against the defined schema, ensuring that only `"yes"` or `"no"` responses are accepted. If the user
declines to answer or the elicitation fails, a fallback value is provided—here, the default answer
is `"no"`.

## Complete Working Example

Here's a complete, copy/pastable MCP server example that combines all the concepts:

```typescript
import { NodeRuntime, NodeStdio } from "@effect/platform-node"
import { Effect, Layer, Logger, Schema } from "effect"
import { McpProtocol, McpSchema, McpServer, Tool, Toolkit } from "effect/ai"

// Define tools
const GreetTool = Tool.make("GreetTool", {
  description: "Generate a greeting message",
  parameters: Schema.Struct({
    name: Schema.String,
    style: Schema.Union([Schema.Literal("formal"), Schema.Literal("casual")])
  }),
  success: Schema.String
})

const CalculatorTool = Tool.make("CalculatorTool", {
  description: "Perform basic arithmetic operations",
  parameters: Schema.Struct({
    operation: Schema.Union([
      Schema.Literal("add"),
      Schema.Literal("subtract"),
      Schema.Literal("multiply"),
      Schema.Literal("divide")
    ]),
    a: Schema.Number,
    b: Schema.Number
  }),
  success: Schema.Number
})

// Create toolkit
const MyToolkit = Toolkit.make(GreetTool, CalculatorTool)

// Define a resource
const ReadmeResource = McpServer.resource({
  uri: "file:///README.md",
  name: "README",
  description: "Project README file",
  mimeType: "text/markdown",
  content: Effect.succeed("# MCP Server Demo\n\nThis is a demo MCP server built with Effect.")
})

// Define a parameterized resource
const idParam = McpSchema.param("id", Schema.NumberFromString)

const UserResource = McpServer.resource`file://users/${idParam}.json`({
  name: "User Data",
  description: "User information by ID",
  completion: {
    id: (_: string) => Effect.succeed([1, 2, 3, 4, 5])
  },
  content: Effect.fn(function*(_uri, id) {
    return JSON.stringify(
      {
        id,
        name: `User ${id}`,
        email: `user${id}@example.com`
      },
      null,
      2
    )
  }),
  mimeType: "application/json"
})

// Define a prompt
const AnalysisPrompt = McpServer.prompt({
  name: "Analyze Data",
  description: "Analyze data and provide insights",
  parameters: {
    dataType: Schema.String,
    focus: Schema.Union([Schema.Literal("summary"), Schema.Literal("details")])
  },
  completion: {
    dataType: () => Effect.succeed(["sales", "users", "metrics"]),
    focus: () => Effect.succeed(["summary" as const, "details" as const])
  },
  content: ({ dataType, focus }) =>
    Effect.succeed(
      `Please analyze the ${dataType} data and provide a ${focus} analysis. Use available tools to gather information.`
    )
})

// Create the server layer
const ServerLayer = Layer.mergeAll(
  ReadmeResource,
  UserResource,
  AnalysisPrompt,
  McpServer.toolkit(MyToolkit).pipe(
    Layer.provideMerge(
      MyToolkit.toLayer({
        GreetTool: ({ name, style }) => {
          const greeting = style === "formal"
            ? `Good day, ${name}. It is a pleasure to meet you.`
            : `Hey ${name}! What's up?`
          return Effect.succeed(greeting)
        },
        CalculatorTool: ({ operation, a, b }) => {
          let result: number
          switch (operation) {
            case "add":
              result = a + b
              break
            case "subtract":
              result = a - b
              break
            case "multiply":
              result = a * b
              break
            case "divide":
              result = a / b
              break
          }
          return Effect.succeed(result)
        }
      })
    )
  )
).pipe(
  Layer.provide(
    McpServer.layerStdio({
      name: "Demo MCP Server",
      version: "1.0.0",
      protocols: [McpProtocol.v2025_06_18]
    })
  ),
  Layer.provide(NodeStdio.layer),
  Layer.provideMerge(Layer.succeed(Logger.LogToStderr, true))
)

// Run the server
Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
```

## Connect to an MCP server

Use `McpClient` to discover and call remote tools, or expose them through an Effect AI Toolkit.
Keep the connection in an Effect scope, or provide it through `McpClient.layerHttp` or `McpClient.layerStdio`. The scope owns
pending calls and transport cleanup.

Choose the protocol adapter on the transport. The client supports both revisions:

- `McpProtocol.v2025_11_25` initializes a connection. HTTP servers can assign a session ID.
- `McpProtocol.v2026_07_28` discovers the server and sends client metadata on each request.
  Modern HTTP tool calls retain the discovered descriptor for header routing.

The client does not choose a revision automatically. Earlier server adapters shown above are not
supported by `McpClient`. This initial client supports tool, prompt, and resource discovery,
tool calls, prompt retrieval, resource reads, and Toolkit adaptation. Resource templates, completion,
logging controls, interactive roots/sampling/elicitation, subscriptions, and live discovery are
reserved for follow-up work. No interactive capabilities are advertised. Legacy server requests
receive a method-not-found response, except ping. Modern input requirements fail with
`UnsupportedError`; the client does not resume or replay the call.

### Connect over HTTP

Use `McpClient.layerHttp` to provide a connected client, supplying its identity and HTTP options.
Provide an `HttpClient` implementation to this layer. This example lists every page of the server's tools
and logs their names. Replace the URL with your server's MCP endpoint.

```typescript
import { Effect, Layer } from "effect"
import { McpClient, McpProtocol } from "effect/ai"
import { FetchHttpClient } from "effect/http"

const ClientLayer = McpClient.layerHttp({
  clientInfo: { name: "report-workflow", version: "1.0.0" },
  protocol: McpProtocol.v2026_07_28,
  url: "http://localhost:3000/mcp"
}).pipe(Layer.provide(FetchHttpClient.layer))

const program = Effect.gen(function*() {
  const client = yield* McpClient.McpClient
  const tools = yield* client.listTools()
  yield* Effect.log(tools.map((tool) => tool.name))
})

await Effect.runPromise(program.pipe(Effect.provide(ClientLayer)))
```

`Effect.provide` builds the layer in a scope and closes the connection after the program finishes.
For an existing application runtime, include `ClientLayer` in its application layer and dispose the
runtime when the application stops. Transport `headers` can supply credentials for your server.
The client does not implement OAuth discovery or token refresh.

### Connect to a subprocess

Use `McpClient.layerStdio` to provide a connected client, supplying its identity and subprocess options.
Provide Node's child-process service to this layer. Replace `./mcp-server.mjs` with your server command.
The child must use newline-delimited JSON-RPC on stdout and send logs to stderr.

```typescript
import { NodeServices } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { McpClient, McpProtocol } from "effect/ai"
import { ChildProcess } from "effect/process"

const ClientLayer = McpClient.layerStdio({
  clientInfo: { name: "report-workflow", version: "1.0.0" },
  protocol: McpProtocol.v2025_11_25,
  command: ChildProcess.make("node", ["./mcp-server.mjs"])
}).pipe(Layer.provide(NodeServices.layer))

const program = Effect.gen(function*() {
  const client = yield* McpClient.McpClient
  const tools = yield* client.listTools()
  yield* Effect.log(tools.map((tool) => tool.name))
})

await Effect.runPromise(program.pipe(Effect.provide(ClientLayer)))
```

Closing the transport scope closes stdin and waits for natural exit. It sends SIGTERM after
five seconds and allows another five seconds before forceful termination. If the process exits while
stdout responses are still being delivered, delivery can finish within five seconds.
A stalled reader is interrupted when that period expires.

For direct construction, provide a transport to `McpClient.make` and wrap the entire use of that
client in `Effect.scoped`. Do not return the client from the scope and use it after the scope closes.

### Compose client operations

Clients support `.pipe()`. Module helpers accept either the client first or return a function
that receives the client through a pipeline. Existing methods such as `client.callTool(params)`
remain available.

```ts
import { Effect, Schema } from "effect"
import { McpClient, McpSchema } from "effect/ai"

const Count = Schema.Struct({ count: Schema.Number })

export const readCountDirect = (client: McpClient.Client, tool: McpSchema.Tool) =>
  McpClient.callTool(client, { tool, schema: Count }, { timeout: "2 seconds" })

export const readCountPiped = (client: McpClient.Client, tool: McpSchema.Tool) =>
  client.pipe(
    McpClient.callTool({ tool, schema: Count }, { timeout: "2 seconds" }),
    Effect.map((result) => result.count)
  )
```

The `callTool` helper supports both dual forms with an optional schema. Schema decoding keeps the
caller's service requirements in both forms. The client must remain inside its owning scope when using either form.

### Call a discovered tool in a workflow

Pass the tool definition returned by discovery to `callTool`. Modern HTTP can route arguments into
headers using annotations in that definition. The transport filters definitions with unsupported
header annotations during discovery. A name alone does not carry the routing information.

This workflow assumes the server exposes a `read_report` tool with a string `reportId` parameter and
structured output shaped like `{ count: number }`.

```typescript
import { Effect, Schema } from "effect"
import { McpClient } from "effect/ai"
import { McpClientError } from "effect/ai/McpClient"

const Report = Schema.Struct({ count: Schema.Number })

export const readReport = Effect.fn("readReport")(function*(reportId: string) {
  const client = yield* McpClient.McpClient
  const tools = yield* client.listTools()
  const tool = tools.find((tool) => tool.name === "read_report")
  if (tool === undefined) {
    return yield* new McpClientError({
      reason: { _tag: "UnsupportedError", message: "Server does not expose read_report" }
    })
  }

  const result = yield* client.callTool({ tool, arguments: { reportId } })
  if (result.isError) {
    return yield* new McpClientError({
      reason: { _tag: "ToolError", message: "The server could not read the report", result }
    })
  }
  return yield* Schema.decodeUnknownEffect(Report)(result.structuredContent).pipe(
    Effect.mapError((cause) =>
      new McpClientError({
        reason: { _tag: "ValidationError", message: "The report has an unexpected shape", cause }
      })
    )
  )
})
```

Run `readReport("quarterly")` with one of the client layers above. `client.listTools()` reads all discovery
pages. `listTools` reads one page and returns `nextCursor` for applications that manage pagination.

`callTool` returns the complete MCP result, including `content`, `structuredContent`, and `isError`.
A tool-reported failure remains a successful Effect result so the workflow can decide what to do.
Transport, protocol, deadline, and validation failures fail with `McpClientError`.

If your application always needs structured output and treats tool-reported failure as an error,
replace the raw call and decoding with:

```typescript
import { Schema } from "effect"
import type { McpClient, McpSchema } from "effect/ai"

const Report = Schema.Struct({ count: Schema.Number })

export const decodeReport = (client: McpClient.Client, tool: McpSchema.Tool, reportId: string) =>
  client.callTool({ tool, arguments: { reportId }, schema: Report })
```

`callTool` with a schema decodes `structuredContent`. It fails with reason `ToolError` when `isError` is true
and puts the original MCP result in `error.reason.result`. It fails with reason `ValidationError` if decoding fails.
Schemas that need services retain those requirements on the returned Effect. Provide those services
at the call site.

The result schema validates output only. Discovery returns remote JSON Schema as metadata; it does
not infer TypeScript argument types or validate arguments against that remote schema. Define your
argument contract in an application service or Toolkit. A Toolkit's parameter schema also validates
arguments when the Toolkit handles a call.

### Discover a required tool when a service starts

For repeated calls, discover the tool during application-service construction and keep its
descriptor in the service handler. This avoids discovery on every call and gives your application
a typed method. Fail construction when the server does not expose the required tool.

```typescript
import { Context, Effect, Layer, Schema } from "effect"
import { McpClient } from "effect/ai"
import { McpClientError } from "effect/ai/McpClient"

const Report = Schema.Struct({ count: Schema.Number })

export class ReportReader extends Context.Service<ReportReader, {
  read(reportId: string, options?: McpClient.CallOptions): Effect.Effect<typeof Report.Type, McpClientError>
}>()("app/ReportReader") {
  static readonly layer = Layer.effect(
    ReportReader,
    Effect.gen(function*() {
      const client = yield* McpClient.McpClient
      const tools = yield* client.listTools()
      const tool = tools.find((tool) => tool.name === "read_report")
      if (tool === undefined) {
        return yield* new McpClientError({
          reason: { _tag: "UnsupportedError", message: "Server does not expose read_report" }
        })
      }
      return ReportReader.of({
        read: (reportId, options) => client.callTool({ tool, arguments: { reportId }, schema: Report }, options)
      })
    })
  )
}

export const readQuarterly = Effect.gen(function*() {
  const reports = yield* ReportReader
  return yield* reports.read("quarterly")
})
```

Provide the connected client with `ReportReader.layer.pipe(Layer.provide(ClientLayer))`, using a
client layer from the connection examples. Ordinary callers then need only `ReportReader`.
This service holds the discovered definition for its lifetime. Rebuild the service to rediscover it
if the server changes that definition.

### Recover from one client failure reason

`Effect.catchReason("McpClientError", "TimeoutError", ...)` handles a deadline failure and leaves
other reasons in the error channel. This example defers a report
after a two-second deadline; tool, transport, protocol, and validation failures still fail.

```typescript
import { Effect, Schema } from "effect"
import type { McpClient, McpSchema } from "effect/ai"

const Report = Schema.Struct({ count: Schema.Number })

export const readWithDeadline = (client: McpClient.Client, tool: McpSchema.Tool, reportId: string) =>
  client.callTool({ tool, arguments: { reportId }, schema: Report }, { timeout: "2 seconds" }).pipe(
    Effect.map((report) => ({ status: "ready" as const, report })),
    Effect.catchReason("McpClientError", "TimeoutError", () => Effect.succeed({ status: "deferred" as const }))
  )
```

For a business rejection, catch `ToolError`. Use `Effect.catchReasons` to handle several reason
tags, or `Effect.unwrapReason("McpClientError")` to handle the reasons directly with `Effect.catchTag`.
`Effect.catchTag("McpClientError", ...)` handles the whole error family. Recovery does not retry
the operation. A timeout does not establish whether the remote tool completed a side effect.

### Display text from a tool rejection

For reason `ToolError`, `error.message` is the client summary and `error.reason.result` contains the
complete typed MCP tool result. This formatter combines text content and falls back to the summary
when the result has no text.

```typescript
import type { McpClientError } from "effect/ai/McpClient"

export const toolFailureMessage = (error: McpClientError): string => {
  if (error.reason._tag !== "ToolError") return error.message
  const text = error.reason.result.content.flatMap((part) => part.type === "text" ? [part.text] : []).join("\n")
  return text.length > 0 ? text : error.message
}
```

Keep the original error when passing it to another handler. This formatter leaves image, resource,
and other non-text content in `error.reason.result` for application-specific rendering.

### Expose a remote tool to a language model

Define the tool's application contract with `Tool.make` and implement it with `Toolkit.toLayer`.
Choose which remote tools the model can use, name them for your application, and write schemas that
match the results your handlers return. `McpClient` does not convert remote JSON Schema into Effect
schemas or automatically expose every discovered tool to the model.

This example discovers `read_report` once when the handler layer starts. It uses the same server
contract as the workflow above.

```typescript
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { Config, Effect, Layer, Schema } from "effect"
import { LanguageModel, McpClient, McpProtocol, Tool, Toolkit } from "effect/ai"
import { McpClientError } from "effect/ai/McpClient"
import { FetchHttpClient } from "effect/http"

const Report = Schema.Struct({ count: Schema.Number })
const ReadReport = Tool.make("ReadReport", {
  description: "Read the count from a report by its report ID",
  parameters: Schema.Struct({ reportId: Schema.String }),
  success: Report,
  failure: McpClientError
})
const ReportToolkit = Toolkit.make(ReadReport)
const ClientLayer = McpClient.layerHttp({
  clientInfo: { name: "report-assistant", version: "1.0.0" },
  protocol: McpProtocol.v2026_07_28,
  url: "http://localhost:3000/mcp"
}).pipe(Layer.provide(FetchHttpClient.layer))

const ReportToolkitLayer = ReportToolkit.toLayer(Effect.gen(function*() {
  const client = yield* McpClient.McpClient
  const tools = yield* client.listTools()
  const tool = tools.find((tool) => tool.name === "read_report")
  if (tool === undefined) {
    return yield* new McpClientError({
      reason: { _tag: "UnsupportedError", message: "Server does not expose read_report" }
    })
  }
  return ReportToolkit.of({
    ReadReport: ({ reportId }) => client.callTool({ tool, arguments: { reportId }, schema: Report })
  })
})).pipe(Layer.provide(ClientLayer))

const OpenAiClientLayer = OpenAiClient.layerConfig({
  apiKey: Config.Redacted("OPENAI_API_KEY")
}).pipe(Layer.provide(FetchHttpClient.layer))

const ModelLayer = OpenAiLanguageModel.layer({ model: "gpt-5.2" }).pipe(
  Layer.provide(OpenAiClientLayer)
)

const program = LanguageModel.generateText({
  prompt: "Read the quarterly report and tell me its count.",
  toolkit: ReportToolkit,
  toolChoice: "required"
}).pipe(
  Effect.provide(Layer.merge(ReportToolkitLayer, ModelLayer))
)

const response = await Effect.runPromise(program)
console.log(response.toolResults)
```

`generateText` executes the tool calls requested in that generation and returns their results.
Use a [Chat loop](../../ai-docs/src/71_ai/30_chat.ts) for a follow-up generation that turns those
results into a final answer.

The `failure` schema keeps MCP failures in the language-model operation's error type. The default
`failureMode: "error"` fails the operation when a tool handler fails. Choose `failureMode: "return"`
if the model should receive a failed tool result and decide how to respond. That choice also lets
server and transport failure details reach the model, so choose the error information your
application wants to disclose.

### Bound discovery and calls

`client.listTools(options?)` returns every page as one tool array. Each call performs a fresh scan.
Discovery shares one total deadline, defaults to 60 seconds, and fails on cursor cycles, more than
100 pages, or more than 10,000 advertised tools. It never presents a partial scan as complete. A
server without the tools capability produces an empty array. Modern HTTP discovery omits tools
whose header routing cannot be represented.

Operations default to a 60-second deadline and admit up to 64 concurrent calls. Set `timeout` on the
client or an individual call to override the deadline. The deadline includes waiting for an admission
permit and structured result decoding. Decoding releases the permit first, so a decoder can call the
same client. The connection handshake has its own total deadline using the configured timeout.

Applications own tracing. Wrap calls with `Effect.withSpan` or `Effect.fn` to choose span names and
attributes. The client creates no operation spans. HTTP tracing follows the supplied HTTP client.
The client does not reconnect, replay calls, restart subprocesses, or retry tool calls automatically.

### Execute discovered tools through a language model

`McpClient.toolkit(client, prefix?)` discovers remote tools and binds handlers through
`Toolkit.make` and `Toolkit.toHandlers`. The result is the standard `Toolkit.WithHandler`
accepted by `LanguageModel`.

```typescript
import { Effect } from "effect"
import { LanguageModel, McpClient } from "effect/ai"

export const readRemoteReport = (client: McpClient.Client) =>
  Effect.gen(function*() {
    const toolkit = yield* McpClient.toolkit(client, "reports__")
    return yield* LanguageModel.generateText({ prompt: "Read the quarterly report", toolkit })
  })
```

The prefix defaults to an empty string. Invalid or duplicate model tool names fail
construction. Remote input JSON Schemas are advertised to providers with strict mode
set to false. Arguments must be JSON objects; remote schemas are not imported for
local validation. Each handler retains its discovered descriptor and original client.
Build a new toolkit between turns to discover changes.

Results become text by joining text, embedded text and labeled resource links in order.
Links are not fetched. Structured JSON is used when content is empty. Binary content
fails with the original result attached. Tool-reported errors fail with `ToolError`;
operational failures also fail the Effect. Calls are not replayed.

For application validation, approval, naming, failure modes or custom result conversion,
define ordinary `Tool.make` or `Tool.dynamic` values and bind their handlers with
`Toolkit.toLayer`. Call `client.callTool` directly when you need complete MCP results.

### Rotate credentials through the supplied HTTP client

Read the current token in the HTTP client's request transformation. Token rotation for the same
principal can reuse the connection. A change of principal replaces the whole generation scope,
including its transport and client.

```typescript
import { Effect, Redacted, Ref } from "effect"
import { HttpClient, HttpClientRequest } from "effect/http"

export const authenticatedClient = (
  base: HttpClient.HttpClient,
  token: Ref.Ref<Redacted.Redacted<string>>
) =>
  base.pipe(
    HttpClient.mapRequestEffect((request) =>
      Ref.get(token).pipe(Effect.map((current) => HttpClientRequest.bearerToken(request, current)))
    )
  )
```

Provide the returned client to `McpClient.http`. The host owns login, refresh, token storage,
and principal identity. Inspect `HttpError` for status, method, authentication challenges, and retry
metadata. Session expiry is distinct from deliberate scope closure. Credential refresh never
implies that a previous tool call is safe to repeat.

The HTTP path uses web request and response APIs and needs no subprocess service. A browser host
closes its connection generation when the owning component or application is disposed. Node hosts
also close the stdio generation to release their child processes.

### Discover and retrieve prompts and resources

Prompt and resource discovery returns complete snapshots. Each list operation follows pagination
within one deadline, with limits of 100 pages and 10,000 entries. An absent server capability
returns an empty list; retrieval without that capability fails with reason `UnsupportedError`.

```ts
import { Effect } from "effect"
import type { McpClient } from "effect/ai"

export const loadContext = (client: McpClient.Client) =>
  Effect.gen(function*() {
    const prompts = yield* client.listPrompts()
    const prompt = prompts.find((prompt) => prompt.name === "review")
    if (prompt !== undefined) {
      const result = yield* client.getPrompt({
        prompt,
        arguments: { code: "const answer = 42" }
      })
      // The MCP result retains its messages, description and metadata.
      yield* Effect.log(result.messages)
    }

    const resources = yield* client.listResources()
    for (const resource of resources) {
      const result = yield* client.readResource({ uri: resource.uri })
      yield* Effect.log(result.contents)
    }
  })
```

`getPrompt` takes a discovered `McpSchema.Prompt` and optional string arguments.
`readResource` takes a URI, including URIs obtained outside resource discovery.
Their results reuse `McpSchema.GetPromptResult` and `McpSchema.ReadResourceResult`,
the same types used by the server. Resource results can contain multiple text or binary contents.

All four operations accept `CallOptions` for a timeout override and have module helpers
supporting both data-first and piped calls. Retrieval preserves MCP results rather than converting
them to `ai/Prompt.Prompt`. Resource templates, subscriptions and argument completion are outside
the client MVP.
