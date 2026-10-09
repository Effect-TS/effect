import { HttpApp } from "@effect/platform"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Effect, HashMap, Logger, LogLevel, Schema } from "effect"

describe("RpcServer", () => {
  it.scoped("logs an error identifying the rpc tag when a handler's success value fails to encode", () => {
    const errorLogs: Array<string> = []
    const logger = Logger.make(({ annotations, logLevel, message }) => {
      if (logLevel === LogLevel.Error) {
        errorLogs.push(JSON.stringify({ message, annotations: Object.fromEntries(HashMap.toEntries(annotations)) }))
      }
    })
    return Effect.gen(function*() {
      const group = RpcGroup.make(Rpc.make("getUserAge", { payload: Schema.Struct({}), success: Schema.Number }))
      const httpApp = yield* RpcServer.toHttpApp(group).pipe(
        Effect.provide([
          group.toLayer({ getUserAge: () => Effect.succeed("not a number" as unknown as number) }),
          RpcSerialization.layerNdjson
        ])
      )
      const handler = HttpApp.toWebHandlerRuntime(yield* Effect.runtime<never>())(httpApp)
      const body = yield* Effect.promise(() =>
        handler(
          new Request("http://test/rpc", {
            method: "POST",
            body: `{"_tag":"Request","id":"1","tag":"getUserAge","payload":{},"headers":[]}\n`
          })
        ).then((response) => response.text())
      )

      assert.include(body, "Expected number", body)
      assert.include(errorLogs.join("\n"), "getUserAge")
    }).pipe(Effect.provide(Logger.replace(Logger.defaultLogger, logger)))
  })
})
