import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as Effect from "effect/Effect"
import { HttpMiddleware, HttpRouter, HttpServerResponse } from "effect/http"
import * as Layer from "effect/Layer"
import { strict as assert } from "node:assert"
import * as Http from "node:http"
import * as Path from "node:path"

const root = process.argv[2]
const mode = process.argv[3]
const server = Http.createServer()
await Effect.runPromise(
  Effect.gen(function*() {
    yield* HttpRouter.add("GET", "/file", HttpServerResponse.file(Path.join(root, "large.bin"))).pipe(
      (routes) =>
        HttpRouter.serve(routes, {
          disableLogger: true,
          disableListenLog: true,
          middleware: HttpMiddleware.compression({ minSize: 0 })
        }),
      Layer.build
    )
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    const url = "http://127.0.0.1:" + address.port + "/file"
    yield* Effect.promise(async () => {
      for (let i = 0; i < 256; i++) {
        await new Promise<void>((resolve, reject) => {
          const request = Http.request(url, {
            method: mode === "head" ? "HEAD" : "GET",
            headers: { "accept-encoding": mode === "head" ? "gzip" : "identity" },
            agent: false
          }, (response) => {
            try {
              assert.equal(response.statusCode, 200)
              if (mode === "head") {
                let bytes = 0
                response.on("data", (chunk) => {
                  bytes += chunk.length
                })
                response.on("end", () => {
                  try {
                    assert.equal(bytes, 0)
                    resolve()
                  } catch (error) {
                    reject(error)
                  }
                })
              } else {
                response.once("data", (chunk) => {
                  try {
                    assert.ok(chunk.length > 0)
                    assert.ok(chunk.length < 8 * 1024 * 1024)
                    response.once("close", resolve)
                  } catch (error) {
                    reject(error)
                  } finally {
                    response.destroy()
                  }
                })
              }
            } catch (error) {
              response.destroy()
              reject(error)
            }
            response.on("error", reject)
          })
          request.on("error", reject)
          request.end()
        })
      }
      // A complete download after the cancellations proves the server and file
      // acquisition still work under the same descriptor budget.
      const final = await fetch(url, { headers: { "accept-encoding": "identity" } })
      assert.equal(final.status, 200)
      const bytes = new Uint8Array(await final.arrayBuffer())
      assert.equal(bytes.length, 8 * 1024 * 1024)
      assert.ok(bytes.every((byte) => byte === 97))
      console.log("completed 256 requests")
    })
  }).pipe(Effect.scoped, Effect.provide(NodeHttpServer.layer(() => server, { port: 0, host: "127.0.0.1" })))
)
