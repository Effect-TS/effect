import { OpenAiClient, OpenAiConfig, OpenAiWorkloadIdentity } from "@effect/ai-openai"
import { type Effect, type FileSystem, Layer, type PlatformError, type Redacted } from "effect"
import { HttpClient } from "effect/http"
import { describe, expect, it } from "tstyche"

declare const identityToken: Effect.Effect<
  Redacted.Redacted<string>,
  PlatformError.PlatformError,
  FileSystem.FileSystem
>

describe("OpenAiWorkloadIdentity", () => {
  const transform = OpenAiWorkloadIdentity.make({
    identityToken,
    identityProviderId: "idp_1",
    serviceAccountId: "sa_1"
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
    const layer = OpenAiWorkloadIdentity.layer({
      identityToken,
      identityProviderId: "idp_1",
      serviceAccountId: "sa_1"
    })

    expect(layer).type.toBe<
      Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient | FileSystem.FileSystem>
    >()
    expect(OpenAiClient.layer({}).pipe(Layer.provide(layer))).type.toBe<
      Layer.Layer<OpenAiClient.OpenAiClient, never, HttpClient.HttpClient | FileSystem.FileSystem>
    >()
  })

  it("is accepted wherever a client transform is", () => {
    type Transform = Effect.Success<typeof transform>
    expect(OpenAiClient.layer).type.toBeCallableWith({ transformClient: {} as Transform })
    expect(OpenAiConfig.withClientTransform).type.toBeCallableWith({} as Transform)
  })

  it("leaves the existing client transforms accepted", () => {
    expect(OpenAiConfig.withClientTransform).type.toBeCallableWith(HttpClient.timeout("30 seconds"))
    expect(OpenAiConfig.withClientTransform).type.toBeCallableWith(HttpClient.filterStatusOk)
    expect(OpenAiConfig.withClientTransform).type.toBeCallableWith((client: HttpClient.HttpClient) => client)
    expect(OpenAiClient.layer).type.toBeCallableWith({ transformClient: HttpClient.timeout("30 seconds") })
    expect(OpenAiClient.layer).type.toBeCallableWith({ transformClient: HttpClient.filterStatusOk })
    expect(OpenAiClient.layer).type.toBeCallableWith({ transformClient: (client: HttpClient.HttpClient) => client })
  })
})
