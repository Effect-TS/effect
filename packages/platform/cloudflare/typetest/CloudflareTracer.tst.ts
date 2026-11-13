import type { Tracing } from "@cloudflare/workers-types"
import type * as CloudflareTracer from "@effect/platform-cloudflare/CloudflareTracer"
import { describe, expect, it } from "tstyche"

describe("CloudflareTracer", () => {
  it("accepts the Workers tracing API", () => {
    expect<Tracing>().type.toBeAssignableTo<CloudflareTracer.Tracing>()
  })
})
