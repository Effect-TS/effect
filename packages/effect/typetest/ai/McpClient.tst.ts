import { Context, Effect, Schema, SchemaGetter } from "effect"
import * as McpClient from "effect/ai/McpClient"
import type { McpClientError } from "effect/ai/McpClientError"
import type * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import { describe, expect, it } from "tstyche"

const client = {} as McpClient.McpClient

const tool = McpSchema.Tool.make({ name: "read", inputSchema: { type: "object" } })

class Policy extends Context.Service<Policy, string>()("test/McpClientPolicy") {}

const Length = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
  decode: SchemaGetter.transformEffect(() => Policy.pipe(Effect.map((value) => value.length))),
  encode: SchemaGetter.transform(String)
}))

describe("McpClient", () => {
  it("should return the raw result when no schema is supplied", () => {
    type Result = Effect.Effect<McpSchema.CallToolResult, McpClientError>
    expect(client.callTool({ tool })).type.toBe<Result>()
    expect(McpClient.callTool(client, { tool })).type.toBe<Result>()
    expect(client.pipe(McpClient.callTool({ tool }, { timeout: "1 second" }))).type.toBe<Result>()
  })

  it("should infer the decoded type and decoder services when a schema is supplied", () => {
    type Result = Effect.Effect<number, McpClientError, Policy>
    expect(client.callTool({ tool, schema: Length })).type.toBe<Result>()
    expect(McpClient.callTool(client, { tool, schema: Length })).type.toBe<Result>()
    expect(client.pipe(McpClient.callTool({ tool, schema: Length }))).type.toBe<Result>()
  })

  it("should return both result shapes when the schema may be absent", () => {
    const schema = {} as typeof Schema.String | undefined
    expect(client.callTool({ tool, schema })).type.toBe<
      Effect.Effect<string | McpSchema.CallToolResult, McpClientError>
    >()
  })

  it("should reuse MCP schema types for prompts and resources", () => {
    const prompt = McpSchema.Prompt.make({ name: "review" })
    expect(McpClient.listPrompts(client)).type.toBe<Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>>()
    expect(client.pipe(McpClient.getPrompt({ prompt, arguments: { code: "example" } }))).type.toBe<
      Effect.Effect<McpSchema.GetPromptResult, McpClientError>
    >()
    expect(McpClient.listResources(client)).type.toBe<
      Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
    >()
    expect(client.pipe(McpClient.readResource({ uri: "test://document" }))).type.toBe<
      Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
    >()
  })

  it("should take the client identity as flat options", () => {
    type Options = Parameters<typeof McpClient.make>[0]
    expect<{ name: string; version: string }>().type.toBeAssignableTo<Options>()
    expect<{
      name: string
      version: string
      title: string
      description: string
      websiteUrl: string
      icons: ReadonlyArray<McpSchema.Icon>
      timeout: "1 second"
    }>().type.toBeAssignableTo<Options>()
    expect<{ clientInfo: McpSchema.Implementation }>().type.not.toBeAssignableTo<Options>()
  })

  it("should accept only client-supported protocol adapters", () => {
    type Protocol = Parameters<typeof McpClient.http>[0]["protocol"]
    expect<typeof McpProtocol.v2025_11_25>().type.toBeAssignableTo<Protocol>()
    expect<typeof McpProtocol.v2026_07_28>().type.toBeAssignableTo<Protocol>()
    expect<typeof McpProtocol.v2025_06_18>().type.not.toBeAssignableTo<Protocol>()
  })
})
