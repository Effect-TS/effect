import { HttpApp } from "@effect/platform"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Schema, Tracer } from "effect"

describe("RpcServer", () => {
  it.scoped("fails the rpc span when a handler's success value fails to encode", () =>
    Effect.gen(function*() {
      const spanExit = yield* Deferred.make<Exit.Exit<unknown, unknown>>()
      const tracer = yield* Tracer.tracerWith(Effect.succeed)
      const testTracer = Tracer.make({
        ...tracer,
        span(...args) {
          const span = tracer.span(...args)
          if (span.name === "RpcServer.getUserAge") {
            const end = span.end.bind(span)
            span.end = (time, exit) => {
              end(time, exit)
              Deferred.unsafeDone(spanExit, Exit.succeed(exit))
            }
          }
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
      const defect = responses[0].exit.cause.defect
      assert.include(defect, "Expected number")
      assert.deepStrictEqual(responses, [{
        _tag: "Exit",
        requestId: "1",
        exit: { _tag: "Failure", cause: { _tag: "Die", defect } }
      }])
      const exit = yield* Deferred.await(spanExit)
      assert(Exit.isFailure(exit))
      assert(Cause.isDie(exit.cause))
      assert.include(Cause.pretty(exit.cause), "Expected number")
    }))
})
