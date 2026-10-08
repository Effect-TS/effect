import { Context, Effect, Schema, SchemaGetter } from "effect"
import * as McpClient from "effect/ai/McpClient"
import type { McpClientError } from "effect/ai/McpClient"
import type * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import { describe, expect, it } from "tstyche"

const tool = McpSchema.Tool.make({ name: "read", inputSchema: { type: "object" } })

class Policy extends Context.Service<Policy, string>()("test/McpClientPolicy") {}

describe("McpClient", () => {
  it("should reuse MCP prompt and resource types in methods and both dual forms", () => {
    const client = {} as McpClient.Client
    const prompt = McpSchema.Prompt.make({ name: "review" })
    const params = { prompt, arguments: { code: "example" } }
    expect(client.listPrompts()).type.toBe<Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>>()
    expect(McpClient.listPrompts(client, { timeout: "1 second" })).type.toBe<
      Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
    >()
    expect(client.pipe(McpClient.listPrompts())).type.toBe<
      Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
    >()
    expect(client.getPrompt(params)).type.toBe<Effect.Effect<McpSchema.GetPromptResult, McpClientError>>()
    expect(McpClient.getPrompt(client, params)).type.toBe<Effect.Effect<McpSchema.GetPromptResult, McpClientError>>()
    expect(client.pipe(McpClient.getPrompt(params, { timeout: "1 second" }))).type.toBe<
      Effect.Effect<McpSchema.GetPromptResult, McpClientError>
    >()
    expect<{ prompt: McpSchema.Prompt; arguments: { code: number } }>().type.not.toBeAssignableTo<
      McpClient.GetPromptParams
    >()
    expect(client.listResources()).type.toBe<Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>>()
    expect(McpClient.listResources(client)).type.toBe<
      Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
    >()
    expect(client.pipe(McpClient.listResources({ timeout: "1 second" }))).type.toBe<
      Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
    >()
    expect(client.readResource({ uri: "test://document" })).type.toBe<
      Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
    >()
    expect(McpClient.readResource(client, { uri: "test://document" })).type.toBe<
      Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
    >()
    expect(client.pipe(McpClient.readResource({ uri: "test://document" }, { timeout: "1 second" }))).type.toBe<
      Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
    >()
  })
  it("should configure the protocol only on the transport", () => {
    expect<"protocol" extends keyof McpClient.Options ? true : false>().type.toBe<false>()
    expect<typeof McpProtocol.v2025_11_25>().type.toBeAssignableTo<
      Parameters<typeof McpClient.http>[0]["protocol"]
    >()
    expect<typeof McpProtocol.v2026_07_28>().type.toBeAssignableTo<
      Parameters<typeof McpClient.http>[0]["protocol"]
    >()
    expect<"2026-07-28">().type.not.toBeAssignableTo<Parameters<typeof McpClient.http>[0]["protocol"]>()
    expect<typeof McpProtocol.v2025_06_18>().type.not.toBeAssignableTo<
      Parameters<typeof McpClient.http>[0]["protocol"]
    >()
  })

  it("should infer the result type when a caller supplies a structured result schema", () => {
    const client = {} as McpClient.Client
    const call = client.callTool({ tool, schema: Schema.Struct({ count: Schema.Number }) })
    expect<typeof call>().type.toBe<Effect.Effect<{ readonly count: number }, McpClientError>>()
  })
  it("should retain operation service requirements when the result decoder uses application services", () => {
    const client = {} as McpClient.Client

    const schema = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
      decode: SchemaGetter.transformEffect(() => Policy.pipe(Effect.map((value) => value.length))),
      encode: SchemaGetter.transform(String)
    }))

    const call = client.callTool({ tool, schema: schema })
    expect<typeof call>().type.toBe<Effect.Effect<number, McpClientError, Policy>>()
  })
  it("should infer schema outputs and decoder services in both dual forms and client pipelines", () => {
    const client = {} as McpClient.Client

    const schema = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
      decode: SchemaGetter.transformEffect(() => Policy.pipe(Effect.map((value) => value.length))),
      encode: SchemaGetter.transform(String)
    }))

    const first = McpClient.callTool(client, { tool, schema: schema })
    const firstWithOptions = McpClient.callTool(client, { tool, schema: schema }, { timeout: "1 second" })
    const last = client.pipe(McpClient.callTool({ tool, schema: schema }))
    const lastWithOptions = client.pipe(McpClient.callTool({ tool, schema: schema }, { timeout: "1 second" }))
    expect<typeof first>().type.toBe<Effect.Effect<number, McpClientError, Policy>>()
    expect<typeof firstWithOptions>().type.toBe<typeof first>()
    expect<typeof last>().type.toBe<typeof first>()
    expect<typeof lastWithOptions>().type.toBe<typeof first>()
    expect(client.pipe()).type.toBe<McpClient.Client>()

    const count = client.pipe(
      McpClient.callTool({ tool, schema: Schema.Struct({ count: Schema.Number }) }),
      Effect.map((value) => value.count)
    )

    expect<typeof count>().type.toBe<Effect.Effect<number, McpClientError>>()
  })
  it("should retain both result shapes when the schema may be absent", () => {
    const client = {} as McpClient.Client
    const schema: typeof Schema.String | undefined = {} as typeof Schema.String | undefined
    const params = { tool, schema }
    type Result = Effect.Effect<string | McpSchema.CallToolResult, McpClientError>
    expect(client.callTool(params)).type.toBe<Result>()
    expect(McpClient.callTool(client, params)).type.toBe<Result>()
    expect(client.pipe(McpClient.callTool(params))).type.toBe<Result>()
    expect(client.callTool({ tool, schema: undefined })).type.toBe<
      Effect.Effect<McpSchema.CallToolResult, McpClientError>
    >()
    expect(McpClient.callTool(client, { tool, schema: undefined })).type.toBe<
      Effect.Effect<McpSchema.CallToolResult, McpClientError>
    >()
    expect(client.pipe(McpClient.callTool({ tool, schema: undefined }))).type.toBe<
      Effect.Effect<McpSchema.CallToolResult, McpClientError>
    >()
    const optional: McpClient.CallToolParams<typeof Schema.String> = { tool }
    expect(client.callTool(optional)).type.toBe<Result>()
    expect(client.callTool<typeof Schema.String>({ tool })).type.toBe<Result>()
    expect(McpClient.callTool<typeof Schema.String>(client, { tool })).type.toBe<Result>()
    expect(client.pipe(McpClient.callTool<typeof Schema.String>({ tool }))).type.toBe<Result>()
  })
  it("should retain decoder services when a service-dependent schema may be absent", () => {
    const client = {} as McpClient.Client
    const decoder = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
      decode: SchemaGetter.transformEffect(() => Policy.pipe(Effect.map((value) => value.length))),
      encode: SchemaGetter.transform(String)
    }))
    const schema = {} as typeof decoder | undefined
    type Result = Effect.Effect<number | McpSchema.CallToolResult, McpClientError, Policy>
    expect(client.callTool({ tool, schema })).type.toBe<Result>()
    expect(McpClient.callTool(client, { tool, schema })).type.toBe<Result>()
    expect(client.pipe(McpClient.callTool({ tool, schema }))).type.toBe<Result>()
  })
  it("should infer operation results in either dual form", () => {
    const client = {} as McpClient.Client
    expect(client.callTool({ tool })).type.toBe<Effect.Effect<McpSchema.CallToolResult, McpClientError>>()
    expect(McpClient.callTool(client, { tool })).type.toBe<Effect.Effect<McpSchema.CallToolResult, McpClientError>>()
    expect(client.pipe(McpClient.callTool({ tool }, { timeout: "1 second" }))).type.toBe<
      Effect.Effect<McpSchema.CallToolResult, McpClientError>
    >()
  })
  it("should expose complete discovery without transport implementation hooks", () => {
    const client = {} as McpClient.Client
    expect(client.listTools()).type.toBe<Effect.Effect<ReadonlyArray<McpSchema.Tool>, McpClientError>>()
    expect(client.listTools({ timeout: "1 second" })).type.toBe<
      Effect.Effect<ReadonlyArray<McpSchema.Tool>, McpClientError>
    >()
    expect<"tools" extends keyof McpClient.Client ? true : false>().type.toBe<false>()
    expect<"serverCapabilities" extends keyof McpClient.Client ? true : false>().type.toBe<false>()
    expect<"concurrency" extends keyof McpClient.Options ? true : false>().type.toBe<false>()
    expect<"_meta" extends keyof McpClient.CallToolParams ? true : false>().type.toBe<false>()
    expect<"request" extends keyof McpClient.Transport["Service"] ? true : false>().type.toBe<false>()
    expect<"close" extends keyof McpClient.Transport["Service"] ? true : false>().type.toBe<false>()
    expect<"filterTools" extends keyof McpClient.Transport["Service"] ? true : false>().type.toBe<false>()
  })
  it("should require a tool descriptor when assigning callTool parameters", () => {
    expect<{ name: string }>().type.not.toBeAssignableTo<McpClient.CallToolParams>()
  })
  it("should exclude task helpers when inspecting the client methods", () => {
    expect<"callToolWithSchema" extends keyof McpClient.Client ? true : false>().type.toBe<false>()
    expect<"getTask" extends keyof McpClient.Client ? true : false>().type.toBe<false>()
    expect<"cancelTask" extends keyof McpClient.Client ? true : false>().type.toBe<false>()
  })
})
