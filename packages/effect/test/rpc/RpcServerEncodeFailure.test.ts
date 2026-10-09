import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Logger, References, Schema } from "effect"
import { HttpEffect } from "effect/http"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "effect/rpc"

describe("RpcServer success encode failure", () => {
  it.effect("logs an error identifying the rpc tag when a handler's success value fails to encode", () => {
    const errorLogs: Array<string> = []
    const logger = Logger.make<unknown, void>((options) => {
      if (options.logLevel === "Error") {
        const annotations = options.fiber.getRef(References.CurrentLogAnnotations)
        errorLogs.push(JSON.stringify({ message: String(options.message), annotations }))
      }
    })
    return Effect.gen(function*() {
      const group = RpcGroup.make(Rpc.make("getUserAge", { payload: Schema.Struct({}), success: Schema.Number }))
      const httpEffect = yield* RpcServer.toHttpEffect(group).pipe(
        Effect.provide(Layer.mergeAll(
          group.toLayer({ getUserAge: () => Effect.succeed("not a number" as unknown as number) }),
          RpcSerialization.layerNdjson
        ))
      )
      const handler = HttpEffect.toWebHandlerWith(yield* Effect.context<never>())(httpEffect)
      const body = yield* Effect.promise(() =>
        handler(
          new Request("http://test/rpc", {
            method: "POST",
            body: `{"_tag":"Request","id":"1","tag":"getUserAge","payload":{},"headers":[]}\n`
          })
        ).then((response) => response.text())
      )

      // The client only receives an anonymous defect; the server must surface which RPC drifted.
      assert.include(body, "Expected number", body)
      assert.isTrue(
        errorLogs.some((log) => log.includes("getUserAge")),
        `expected an error log naming the rpc tag, got: ${JSON.stringify(errorLogs)}`
      )
    }).pipe(Effect.provide(Logger.layer([logger])))
  })
})
