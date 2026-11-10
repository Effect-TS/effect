import { OpenAiClient, OpenAiConfig, OpenAiWorkloadIdentity } from "@effect/ai-openai"
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
  identityProviderId: "idp_1",
  serviceAccountId: "sa_1"
}

describe("OpenAiWorkloadIdentity", () => {
  it("makes a client transform and a layer, requiring what the identity token requires", () => {
    expect(OpenAiWorkloadIdentity.make(options)).type.toBe<
      Effect.Effect<
        (client: HttpClient.HttpClient) => HttpClient.HttpClient,
        never,
        HttpClient.HttpClient | FileSystem.FileSystem
      >
    >()
    expect(OpenAiWorkloadIdentity.layer(options)).type.toBe<
      Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient | FileSystem.FileSystem>
    >()
  })

  it("leaves the existing client transforms accepted", () => {
    expect(OpenAiClient.layer).type.toBeCallableWith({ transformClient: HttpClient.timeout("30 seconds") })
    expect(OpenAiClient.layer).type.toBeCallableWith({ transformClient: HttpClient.filterStatusOk })
    expect(OpenAiClient.layer).type.toBeCallableWith({ transformClient: (client: HttpClient.HttpClient) => client })
    expect(OpenAiConfig.withClientTransform).type.toBeCallableWith(HttpClient.timeout("30 seconds"))
    expect(OpenAiConfig.withClientTransform).type.toBeCallableWith(HttpClient.filterStatusOk)
    expect(OpenAiConfig.withClientTransform).type.toBeCallableWith((client: HttpClient.HttpClient) => client)
  })
})
