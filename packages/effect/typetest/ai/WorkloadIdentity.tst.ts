import type { Effect, FileSystem, PlatformError, Redacted } from "effect"
import { WorkloadIdentity } from "effect/ai"
import type { HttpClient } from "effect/http"
import { describe, expect, it } from "tstyche"

declare const identityToken: Effect.Effect<
  Redacted.Redacted<string>,
  PlatformError.PlatformError,
  FileSystem.FileSystem
>

describe("WorkloadIdentity", () => {
  it("makes a client transform, requiring an HttpClient and what the identity token requires", () => {
    expect(WorkloadIdentity.make({
      tokenUrl: "https://auth.example.com/oauth/token",
      identityToken,
      exchangeRequest: (request) => request
    })).type.toBe<
      Effect.Effect<
        (client: HttpClient.HttpClient) => HttpClient.HttpClient,
        never,
        HttpClient.HttpClient | FileSystem.FileSystem
      >
    >()
  })
})
