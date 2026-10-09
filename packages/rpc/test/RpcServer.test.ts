import { HttpApp } from "@effect/platform"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Schema, Tracer } from "effect"

describe("RpcServer", () => {
  it.scoped("fails the rpc span when a handler's success value fails to encode", () =>
    Effect.gen(function*() {
      const spans: Array<Tracer.Span> = []
      const tracer = yield* Effect.tracer
      const testTracer = Tracer.make({
        ...tracer,
        span(...args) {
          const span = tracer.span(...args)
          spans.push(span)
          return span
        }
      })
      const group = RpcGroup.make(Rpc.make("getUserAge", { payload: Schema.Struct({}), success: Schema.Number }))
      const httpApp = yield* RpcServer.toHttpApp(group).pipe(
        Effect.provide([
          group.toLayer({ getUserAge: () => Effect.succeed("not a number" as unknown as number) }),
          RpcSerialization.layerNdjson
        ])
      )
      const runtime = yield* Effect.runtime<never>().pipe(Effect.withTracer(testTracer))
      const handler = HttpApp.toWebHandlerRuntime(runtime)(httpApp)
      const body = yield* Effect.promise(() =>
        handler(
          new Request("http://test/rpc", {
            method: "POST",
            body: `{"_tag":"Request","id":"1","tag":"getUserAge","payload":{},"headers":[]}\n`
          })
        ).then((response) => response.text())
      )

      const responses = body.trim().split("\n").map((line) => JSON.parse(line))
      assert.strictEqual(responses.length, 1)
      assert.include(responses[0].exit.cause.defect, "Expected number")
      const span = spans.find((span) => span.name === "RpcServer.getUserAge")!
      assert(span.status._tag === "Ended" && Exit.isFailure(span.status.exit))
      assert.include(Cause.pretty(span.status.exit.cause), "Expected number")
    }))
})
