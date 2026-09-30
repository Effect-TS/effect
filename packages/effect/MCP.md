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

## Workflow-backed tasks

`McpTasks.toolkit(tools, handlers, options)` registers every tool in a toolkit as a
Workflow-backed task. It returns a registration layer requiring `McpServer` and an
existing `WorkflowEngine`. Register ordinary inline tools with `McpServer.toolkit`.

```ts
import { Effect, Layer, Schema } from "effect"
import { McpTasks, Tool, Toolkit } from "effect/ai"
import { Activity, WorkflowEngine } from "effect/workflow"

const Reports = Toolkit.make(Tool.make("workspace_report", {
  parameters: Schema.Struct({ workspaceId: Schema.String }),
  success: Schema.String
}))

const ReportsLive = McpTasks.toolkit(Reports, {
  workspace_report: ({ workspaceId }) =>
    Activity.make({
      name: "build-report",
      success: Schema.String,
      execute: Effect.succeed(`Report for ${workspaceId}`)
    })
}, {
  name: "workspace-reports-v1",
  owner: "shared"
}).pipe(Layer.provide(WorkflowEngine.layerMemory))

// Provide McpServer when composing ReportsLive with the server layer.
```

Use a stable namespace in `name`. Change it when handler changes are incompatible
with replay of existing executions. The engine determines whether execution
survives a process restart. Applications can supply the existing SQL-backed
`ClusterWorkflowEngine` instead of the memory engine. Tasks requires no separate
Persistence layer.

`owner: "shared"` allows every client to access the toolkit's tasks. For isolation,
supply an Effect resolving a trusted application principal. It can read
`McpSchema.McpRequestContext`, but client-provided names and metadata are not proof
of identity. The same resolver authorizes reads, updates, and cancellation.

### Execution and retrieval

The server advertises the Tasks extension when task tools are registered. A July
client must declare the extension on each request. Earlier clients do not see
these tools. A supported `tools/call` receives a task handle after the engine
accepts execution and the task's identity is readable. Parameter decoding uses
the ordinary MCP toolkit implementation inside Workflow. Invalid parameters can
therefore produce a handle followed by a failed task, without running user code.

The client calls `tasks/get`. Each request checks identity and polls Workflow;
there is no background polling loop. Workflow supplies the result or error and
owns Activity replay. Declared tool errors remain completed MCP tool results with
`isError: true`, following ordinary tool execution behavior.

Tasks stores two immutable facts using existing `DurableDeferred` APIs:

| Fact               | Contents                                 | Purpose                         |
| ------------------ | ---------------------------------------- | ------------------------------- |
| Identity           | Owner and creation timestamp             | Existence and authorization     |
| Finished timestamp | Time recorded by `Workflow.addFinalizer` | Stable terminal `lastUpdatedAt` |

The task handle uses an existing durable token to identify its Workflow and
execution. Routing accepts only registered Workflows and the identity deferred.
It does not grant authorization. While work is active, `lastUpdatedAt` equals
`createdAt`. Terminal responses use the finished timestamp. Identity and terminal
timestamps use the engine's clock.

A normal active read uses one fact lookup and one Workflow poll. A normal terminal
read adds one timestamp lookup. Neither path scans history or reconstructs a live
view. Creation and terminal reads use a short bounded retry when an accepted fact
is not yet visible. A remaining visibility delay returns a retryable request error
rather than inventing a timestamp or waiting indefinitely.

### MVP boundaries

All tasks report `ttlMs: null`. Workflow owns physical history cleanup. An engine
that deletes a task's identity can no longer serve that handle; unlimited protocol
TTL does not configure engine retention.

`tasks/cancel` authorizes the task, requests `WorkflowEngine.interrupt`, and
acknowledges. Interruption is cooperative. The task can remain working or complete
before interruption takes effect. The server reports cancelled only when the
engine reports an interrupted outcome.

`tasks/update` authorizes the task and acknowledges. This implementation issues no
interactive input requests, so response keys are ignored. Progress, task-specific
timeouts, expiry interruption, notifications, inline fallback, and interactive
roots, sampling, or elicitation are outside this MVP.

### Implementation and tests

`McpTasks.ts` exposes the registration function and options. `internal/mcpTasks.ts`
registers Workflows and projects their results using the two immutable facts.
`internal/mcpTasksBinding.ts` routes protocol calls to registered task tools and
validates task handles. The July protocol adapter retains its complete protocol
schemas, including shapes this implementation does not produce.

`McpTasks.test.ts` covers HTTP behavior, ordinary tool coexistence, schemas,
services, capabilities, ownership, and cancellation acknowledgement.
`McpTasksWorkflow.test.ts` reconstructs SQLite-backed runners to verify durable
results, timestamps, ownership, and Activity replay. Type tests cover handler,
schema, construction, and owner service requirements. The old metadata storage,
revision journal, and live-view prototypes are removed.
