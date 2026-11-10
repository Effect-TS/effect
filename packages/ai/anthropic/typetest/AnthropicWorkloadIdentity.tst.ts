import { AnthropicClient, AnthropicConfig, AnthropicWorkloadIdentity } from "@effect/ai-anthropic"
import { type Effect, type FileSystem, Layer, type PlatformError, type Redacted } from "effect"
import { HttpClient } from "effect/http"
import { describe, expect, it } from "tstyche"

declare const identityToken: Effect.Effect<
  Redacted.Redacted<string>,
  PlatformError.PlatformError,
  FileSystem.FileSystem
>

describe("AnthropicWorkloadIdentity", () => {
  const transform = AnthropicWorkloadIdentity.make({
    identityToken,
    federationRuleId: "fdrl_1",
    organizationId: "org_1"
  })

  it("makes an ordinary client transform, requiring what the identity token requires", () => {
    expect(transform).type.toBe<
      Effect.Effect<
        (client: HttpClient.HttpClient) => HttpClient.HttpClient,
        never,
        HttpClient.HttpClient | FileSystem.FileSystem
      >
    >()
  })

  it("provides an HttpClient as a layer, requiring one and what the identity token requires", () => {
    const layer = AnthropicWorkloadIdentity.layer({
      identityToken,
      federationRuleId: "fdrl_1",
      organizationId: "org_1"
    })

    expect(layer).type.toBe<
      Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient | FileSystem.FileSystem>
    >()
    expect(AnthropicClient.layer({}).pipe(Layer.provide(layer))).type.toBe<
      Layer.Layer<AnthropicClient.AnthropicClient, never, HttpClient.HttpClient | FileSystem.FileSystem>
    >()
  })

  it("is accepted wherever a client transform is", () => {
    type Transform = Effect.Success<typeof transform>
    expect(AnthropicClient.layer).type.toBeCallableWith({ transformClient: {} as Transform })
    expect(AnthropicConfig.withClientTransform).type.toBeCallableWith({} as Transform)
  })

  it("leaves the existing client transforms accepted", () => {
    expect(AnthropicConfig.withClientTransform).type.toBeCallableWith(HttpClient.timeout("30 seconds"))
    expect(AnthropicConfig.withClientTransform).type.toBeCallableWith(HttpClient.filterStatusOk)
    expect(AnthropicConfig.withClientTransform).type.toBeCallableWith((client: HttpClient.HttpClient) => client)
    expect(AnthropicClient.layer).type.toBeCallableWith({ transformClient: HttpClient.timeout("30 seconds") })
    expect(AnthropicClient.layer).type.toBeCallableWith({ transformClient: HttpClient.filterStatusOk })
    expect(AnthropicClient.layer).type.toBeCallableWith({ transformClient: (client: HttpClient.HttpClient) => client })
  })
})
