/// <reference types="@cloudflare/workers-types" />

import * as CloudflareAlchemy from "@effect/platform-cloudflare/CloudflareAlchemy"
import type * as Cloudflare from "alchemy/Cloudflare"
import { describe, expect, test } from "tstyche"

describe("CloudflareAlchemy", () => {
  test("adds typed cluster bindings to the Worker environment", () => {
    const deployment = CloudflareAlchemy.worker("Api", {
      main: "./src/worker.ts",
      env: {
        LABEL: "api"
      }
    })
    type Env = Cloudflare.InferEnv<typeof deployment>
    type EntityStub = ReturnType<Env["CLUSTER_ENTITY"]["getByName"]>
    type WorkflowStub = ReturnType<Env["CLUSTER_WORKFLOW"]["getByName"]>

    expect<Env["LABEL"]>().type.toBe<"api">()
    expect<EntityStub["invoke"]>().type.toBeCallableWith("request", false)
    expect<WorkflowStub["run"]>().type.toBeCallableWith("payload", { discard: false })
    expect<Env["CLUSTER_SINGLETON_TRIGGERS"]>().type.toBe<Record<string, Array<string>>>()
  })
})
