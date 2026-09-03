import * as BunHttpServer from "@effect/platform-bun/BunHttpServer"
import { afterAll, assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Scope } from "effect"
import { HttpServer, HttpServerResponse } from "effect/unstable/http"
import { existsSync } from "node:fs"
import { lstat, mkdtemp, rmdir, unlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const ownedDirectories: Array<string> = []

const makeUnix = Effect.fn(function*() {
  const directory = yield* Effect.acquireRelease(
    Effect.promise(() => mkdtemp(join(tmpdir(), "s8u-"))),
    (directory) =>
      Effect.promise(async () => {
        const path = join(directory, "s")
        if (existsSync(path)) await unlink(path)
        await rmdir(directory)
        assert.isFalse(existsSync(path))
        assert.isFalse(existsSync(directory))
      })
  )
  ownedDirectories.push(directory)
  const path = join(directory, "s")
  // macOS sockaddr_un has a short path limit; use a one-character socket name.
  assert.isBelow(Buffer.byteLength(path), 104)
  const server = yield* BunHttpServer.make({ unix: path })
  yield* server.serve(Effect.succeed(HttpServerResponse.text("native-unix")))
  const stat = yield* Effect.promise(() => lstat(path))
  assert.isTrue(stat.isSocket())
  const response = yield* Effect.promise(() =>
    fetch("http://localhost/", {
      unix: path,
      headers: { connection: "close" }
    })
  )
  assert.strictEqual(response.status, 200)
  assert.strictEqual(yield* Effect.promise(() => response.text()), "native-unix")
  return { directory, path, server }
})

describe.sequential("BunHttpServer Unix address", () => {
  afterAll(() => {
    for (const directory of ownedDirectories) assert.isFalse(existsSync(directory))
    console.info(`Verified cleanup of ${ownedDirectories.length} owned Unix socket directories`)
  })

  it("runs under native Bun, not a Node-only mock", () => {
    assert.strictEqual(process.versions.bun, Bun.version)
    assert.strictEqual(typeof Bun.serve, "function")
    console.info(`Native runtime: Bun ${Bun.version}; platform: ${process.platform}`)
  })

  it.live("preserves the TCP address contract and serves an actual request", () =>
    Effect.gen(function*() {
      const server = yield* BunHttpServer.make({ hostname: "127.0.0.1", port: 0 })
      yield* server.serve(Effect.succeed(HttpServerResponse.text("native-tcp")))
      if (server.address._tag !== "TcpAddress") throw new Error("Expected TcpAddress")
      assert.strictEqual(server.address.hostname, "127.0.0.1")
      assert.isTrue(Number.isInteger(server.address.port))
      assert.isAbove(server.address.port, 0)
      const url = HttpServer.formatAddress(server.address)
      assert.strictEqual(url, `http://127.0.0.1:${server.address.port}`)
      const response = yield* Effect.promise(() => fetch(url, { headers: { connection: "close" } }))
      assert.strictEqual(response.status, 200)
      assert.strictEqual(yield* Effect.promise(() => response.text()), "native-tcp")
    }))

  it.live("serves over an actual Unix socket and cleans up its scoped fixture", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const { directory, path } = yield* makeUnix().pipe(Scope.provide(scope))
      yield* Scope.close(scope, Exit.void)
      assert.isFalse(existsSync(path))
      assert.isFalse(existsSync(directory))
    }))

  it.live("reports the Unix socket address rather than undefined TCP fields", () =>
    Effect.gen(function*() {
      const { path, server } = yield* makeUnix()
      assert.deepStrictEqual(server.address, { _tag: "UnixAddress", path })
    }))

  it.live("formats the actual Unix server address with the common UnixAddress contract", () =>
    Effect.gen(function*() {
      const { path, server } = yield* makeUnix()
      assert.strictEqual(HttpServer.formatAddress({ _tag: "UnixAddress", path }), `unix://${path}`)
      assert.strictEqual(HttpServer.formatAddress(server.address), `unix://${path}`)
    }))
})
