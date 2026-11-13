/// <reference types="@cloudflare/workers-types" />
import type * as CloudflareTracer from "@effect/platform-cloudflare/CloudflareTracer"
import { tracing } from "cloudflare:workers"
import { describe, expect, test } from "tstyche"

describe("CloudflareTracer", () => {
  test("accepts the Workers tracing API", () => {
    expect(tracing).type.toBeAssignableTo<CloudflareTracer.Tracing>()
  })
})
