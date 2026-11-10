import { AnthropicClient, AnthropicConfig, AnthropicWorkloadIdentity } from "@effect/ai-anthropic"
import type { Effect, FileSystem, Layer, PlatformError, Redacted } from "effect"
import { HttpClient } from "effect/http"
import { describe, expect, it } from "tstyche"

declare const identityToken: Effect.Effect<
  Redacted.Redacted<string>,
  PlatformError.PlatformError,
  FileSystem.FileSystem
>

const options = {
  identityToken,
  federationRuleId: "fdrl_1",
  organizationId: "org_1"
}

describe("AnthropicWorkloadIdentity", () => {
  it("makes a client transform and a layer, requiring what the identity token requires", () => {
    expect(AnthropicWorkloadIdentity.make(options)).type.toBe<
      Effect.Effect<
        (client: HttpClient.HttpClient) => HttpClient.HttpClient,
        never,
        HttpClient.HttpClient | FileSystem.FileSystem
      >
    >()
    expect(AnthropicWorkloadIdentity.layer(options)).type.toBe<
      Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient | FileSystem.FileSystem>
    >()
  })

  it("leaves the existing client transforms accepted", () => {
    expect(AnthropicClient.layer).type.toBeCallableWith({ transformClient: HttpClient.timeout("30 seconds") })
    expect(AnthropicClient.layer).type.toBeCallableWith({ transformClient: HttpClient.filterStatusOk })
    expect(AnthropicClient.layer).type.toBeCallableWith({ transformClient: (client: HttpClient.HttpClient) => client })
    expect(AnthropicConfig.withClientTransform).type.toBeCallableWith(HttpClient.timeout("30 seconds"))
    expect(AnthropicConfig.withClientTransform).type.toBeCallableWith(HttpClient.filterStatusOk)
    expect(AnthropicConfig.withClientTransform).type.toBeCallableWith((client: HttpClient.HttpClient) => client)
  })
})
