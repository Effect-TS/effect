import { assert, describe } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PlatformError from "effect/PlatformError"
import * as Sftp from "effect/ssh/Sftp"
import * as Ssh from "effect/ssh/Ssh"
import * as SshClient from "effect/ssh/SshClient"
import type * as SshError from "effect/ssh/SshError"
import * as SshKey from "effect/ssh/SshKey"
import * as Stream from "effect/Stream"
import { it, runWithCrypto } from "./utils/crypto.ts"
import * as SftpServer from "./utils/SftpServer.ts"
import * as TestServer from "./utils/TestServer.ts"

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const bytes = (value: string) => encoder.encode(value)
const text = (value: Uint8Array) => decoder.decode(value)

/** Deterministic, non-repeating-looking test data. */
const pattern = (size: number, seed = 0) => {
  const out = new Uint8Array(size)
  let state = (seed * 2654435761 + 1) >>> 0
  for (let i = 0; i < size; i++) {
    state = (state * 1103515245 + 12345) >>> 0
    out[i] = state >>> 24
  }
  return out
}

const concatAll = (chunks: ReadonlyArray<Uint8Array>) => {
  const out = new Uint8Array(chunks.reduce((n, chunk) => n + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

const hostKey = Effect.succeed(await runWithCrypto(SshKey.generate("ssh-ed25519")))
const userKey = Effect.succeed(await runWithCrypto(SshKey.generate("ssh-ed25519", { comment: "user" })))

const connectClient = Effect.fnUntraced(function*(server: SftpServer.SftpServer) {
  const key = yield* userKey
  const ssh = yield* TestServer.runServer({
    hostKey: yield* hostKey,
    publicKeys: [key.publicKey],
    onSession: server.onSession
  })
  const client = yield* SshClient.make(ssh.socket, {
    host: "test.local",
    username: "tester",
    auth: [SshClient.publicKey(key)],
    verifyHostKey: SshClient.acceptAnyHostKey
  })
  yield* ssh.server
  return client
})

const connect = Effect.fnUntraced(function*(options: SftpServer.SftpServerOptions = {}) {
  const server = SftpServer.make(options)
  const client = yield* connectClient(server)
  const sftp = yield* Sftp.make(Ssh.fromClient(client))
  return { client, sftp, server, tree: server.fs, fs: Sftp.fileSystem(sftp) }
})

const sftpCode = (error: SshError.SshError) => error.reason._tag === "SshSftpError" ? error.reason.code : undefined

const reasonTag = (error: PlatformError.PlatformError) => error.reason._tag

const count = (requests: ReadonlyArray<string>, name: string) => requests.filter((request) => request === name).length

describe("Sftp", () => {
  describe("session", () => {
    it.effect("negotiates version 3 and the OpenSSH extensions", () =>
      Effect.gen(function*() {
        const { server, sftp } = yield* connect()
        assert.strictEqual(sftp.version, 3)
        assert.strictEqual(server.stats.clientVersion, 3)
        assert.deepStrictEqual([...sftp.extensions.keys()].sort(), [...SftpServer.defaultExtensions].sort())
        assert.isTrue(Sftp.isSftp(sftp))
        // limits@openssh.com reports 255 KiB, which the client accepts.
        assert.strictEqual(sftp.maxReadLength, 255 * 1024)
        assert.strictEqual(sftp.maxWriteLength, 255 * 1024)
      }))

    it.effect("uses the limits reported by limits@openssh.com", () =>
      Effect.gen(function*() {
        const { sftp } = yield* connect({ maxReadLength: 1000, maxWriteLength: 2000 })
        assert.strictEqual(sftp.maxReadLength, 1000)
        assert.strictEqual(sftp.maxWriteLength, 2000)
      }))

    it.effect("caps limits above 255 KiB", () =>
      Effect.gen(function*() {
        const { sftp } = yield* connect({ maxPacketLength: 4 * 1024 * 1024 })
        assert.strictEqual(sftp.maxReadLength, 255 * 1024)
      }))

    it.effect("falls back to 32 KiB chunks without limits@openssh.com", () =>
      Effect.gen(function*() {
        const { server, sftp } = yield* connect({ extensions: [] })
        assert.strictEqual(sftp.extensions.size, 0)
        assert.strictEqual(sftp.maxReadLength, 32 * 1024)
        assert.strictEqual(sftp.maxWriteLength, 32 * 1024)
        assert.isFalse(server.stats.requests.includes("extended:limits@openssh.com"))
      }))

    it.effect("provides a session through Sftp.layer", () =>
      Effect.gen(function*() {
        const server = SftpServer.make()
        server.fs.writeFile("hello.txt", "from layer")
        const client = yield* connectClient(server)
        const content = yield* Effect.gen(function*() {
          const sftp = yield* Sftp.Sftp
          return text(yield* sftp.readFile("hello.txt"))
        }).pipe(Effect.provide(Layer.provide(Sftp.layer, Layer.succeed(Ssh.Ssh, Ssh.fromClient(client)))))
        assert.strictEqual(content, "from layer")
      }))

    it.effect("reassembles responses split across many channel data chunks", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect({ responseChunkSize: 7, maxReadLength: 1000 })
        const data = pattern(20_000)
        tree.writeFile("split.bin", data)
        assert.deepStrictEqual(yield* sftp.readFile("split.bin"), data)
        assert.strictEqual((yield* sftp.stat("split.bin")).size, BigInt(20_000))
      }))

    it.effect("matches responses that arrive out of order", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect({ reorderResponses: true })
        tree.writeFile("a.txt", "a")
        tree.writeFile("b.txt", "bb")
        const sizes = yield* Effect.forEach(
          ["a.txt", "b.txt", "a.txt", "b.txt"],
          (path) => Effect.map(sftp.stat(path), (attributes) => attributes.size),
          { concurrency: "unbounded" }
        )
        assert.deepStrictEqual(sizes, [BigInt(1), BigInt(2), BigInt(1), BigInt(2)])
      }))
  })

  describe("files", () => {
    it.effect("opens, writes, reads, and stats files", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect()
        const written = yield* Effect.scoped(Effect.gen(function*() {
          const file = yield* sftp.open("notes.txt", { flag: "w", mode: 0o600 })
          yield* file.write(BigInt(0), bytes("hello"))
          yield* file.write(BigInt(5), bytes(" world"))
          return yield* file.stat
        }))
        assert.strictEqual(written.size, BigInt(11))
        assert.strictEqual(written.permissions, SftpServer.S_IFREG | 0o600)
        assert.strictEqual(written.uid, 1000)
        assert.strictEqual(written.gid, 1000)
        assert.isNumber(written.mtime)
        assert.strictEqual(tree.readFileString("/home/tester/notes.txt"), "hello world")
        yield* Effect.scoped(Effect.gen(function*() {
          const file = yield* sftp.open("notes.txt")
          assert.strictEqual(file.path, "notes.txt")
          assert.deepStrictEqual(Option.map(yield* file.read(BigInt(0), 5), text), Option.some("hello"))
          assert.deepStrictEqual(Option.map(yield* file.read(BigInt(6), 100), text), Option.some("world"))
          assert.isTrue(Option.isNone(yield* file.read(BigInt(11), 10)))
        }))
        // Handles are closed when their scope closes.
        assert.strictEqual(server.openHandles(), 0)
        assert.strictEqual(count(server.stats.requests, "close"), 2)
      }))

    it.effect("applies the server umask to the default creation mode", () =>
      Effect.gen(function*() {
        const { sftp } = yield* connect()
        yield* sftp.writeFile("default.txt", bytes("x"))
        assert.strictEqual((yield* sftp.stat("default.txt")).permissions, SftpServer.S_IFREG | 0o644)
      }))

    it.effect("clamps reads to the maximum read length", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect({ maxReadLength: 1024 })
        tree.writeFile("big.bin", pattern(10_000))
        const chunk = yield* Effect.scoped(Effect.flatMap(sftp.open("big.bin"), (file) => file.read(BigInt(0), 10_000)))
        assert.strictEqual(Option.getOrThrow(chunk).length, 1024)
        assert.strictEqual(server.stats.largestRead, 1024)
      }))

    it.effect("honours open flags", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("file.txt", "0123456789")

        const missing = yield* Effect.flip(Effect.scoped(sftp.open("missing.txt")))
        assert.strictEqual(sftpCode(missing), Sftp.StatusCode.NO_SUCH_FILE)

        const exclusive = yield* Effect.flip(Effect.scoped(sftp.open("file.txt", { flag: "wx" })))
        assert.strictEqual(sftpCode(exclusive), Sftp.StatusCode.FAILURE)
        assert.strictEqual(tree.readFileString("file.txt"), "0123456789")

        // r+ neither creates nor truncates.
        const noCreate = yield* Effect.flip(Effect.scoped(sftp.open("other.txt", { flag: "r+" })))
        assert.strictEqual(sftpCode(noCreate), Sftp.StatusCode.NO_SUCH_FILE)
        yield* Effect.scoped(
          Effect.flatMap(sftp.open("file.txt", { flag: "r+" }), (file) => file.write(BigInt(2), bytes("ab")))
        )
        assert.strictEqual(tree.readFileString("file.txt"), "01ab456789")

        // Append mode ignores the offset.
        yield* Effect.scoped(Effect.gen(function*() {
          const file = yield* sftp.open("file.txt", { flag: "a" })
          yield* file.write(BigInt(0), bytes("X"))
          yield* file.write(BigInt(3), bytes("Y"))
        }))
        assert.strictEqual(tree.readFileString("file.txt"), "01ab456789XY")

        // w truncates.
        yield* Effect.scoped(
          Effect.flatMap(sftp.open("file.txt", { flag: "w" }), (file) => file.write(BigInt(0), bytes("new")))
        )
        assert.strictEqual(tree.readFileString("file.txt"), "new")

        // wx creates new files.
        yield* sftp.writeFile("fresh.txt", bytes("fresh"), { flag: "wx" })
        assert.strictEqual(tree.readFileString("fresh.txt"), "fresh")

        // Writing a read-only handle fails (EBADF, reported as NO_SUCH_FILE by OpenSSH).
        const readOnly = yield* Effect.flip(
          Effect.scoped(Effect.flatMap(sftp.open("file.txt"), (file) => file.write(BigInt(0), bytes("nope"))))
        )
        assert.strictEqual(sftpCode(readOnly), Sftp.StatusCode.NO_SUCH_FILE)
        assert.strictEqual(tree.readFileString("file.txt"), "new")
      }))

    it.effect("reports permission failures", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("secret.txt", "secret", { mode: 0o000 })
        const read = yield* Effect.flip(sftp.readFile("secret.txt"))
        assert.strictEqual(sftpCode(read), Sftp.StatusCode.PERMISSION_DENIED)
        const create = yield* Effect.flip(sftp.writeFile("/forbidden.txt", bytes("x")))
        assert.strictEqual(sftpCode(create), Sftp.StatusCode.PERMISSION_DENIED)
        tree.makeDirectory("locked", { mode: 0o000 })
        const traverse = yield* Effect.flip(sftp.stat("locked/anything"))
        assert.strictEqual(sftpCode(traverse), Sftp.StatusCode.PERMISSION_DENIED)
      }))

    it.effect("changes attributes by path and by handle", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("attrs.txt", "0123456789")
        yield* sftp.setStat("attrs.txt", { size: BigInt(4) })
        assert.strictEqual(tree.readFileString("attrs.txt"), "0123")
        yield* sftp.setStat("attrs.txt", { permissions: 0o640, atime: 1_000, mtime: 2_000 })
        const attributes = yield* sftp.stat("attrs.txt")
        assert.strictEqual(attributes.permissions, SftpServer.S_IFREG | 0o640)
        assert.strictEqual(attributes.atime, 1_000)
        assert.strictEqual(attributes.mtime, 2_000)
        // Unprivileged users may change the group but not the owner.
        yield* sftp.setStat("attrs.txt", { uid: 1000, gid: 50 })
        assert.strictEqual((yield* sftp.stat("attrs.txt")).gid, 50)
        const chown = yield* Effect.flip(sftp.setStat("attrs.txt", { uid: 0, gid: 0 }))
        assert.strictEqual(sftpCode(chown), Sftp.StatusCode.PERMISSION_DENIED)

        yield* Effect.scoped(Effect.gen(function*() {
          const file = yield* sftp.open("attrs.txt", { flag: "r+" })
          yield* file.setStat({ size: BigInt(8) })
          yield* file.setStat({ atime: 3_000, mtime: 4_000 })
          const stat = yield* file.stat
          assert.strictEqual(stat.size, BigInt(8))
          assert.strictEqual(stat.mtime, 4_000)
        }))
        assert.deepStrictEqual(tree.readFile("attrs.txt"), new Uint8Array([48, 49, 50, 51, 0, 0, 0, 0]))

        const missing = yield* Effect.flip(sftp.setStat("missing.txt", { permissions: 0o600 }))
        assert.strictEqual(sftpCode(missing), Sftp.StatusCode.NO_SUCH_FILE)
      }))

    it.effect("syncs through fsync@openssh.com when available", () =>
      Effect.gen(function*() {
        const { server, sftp } = yield* connect()
        yield* Effect.scoped(Effect.flatMap(sftp.open("sync.txt", { flag: "w" }), (file) => file.sync))
        assert.strictEqual(count(server.stats.requests, "extended:fsync@openssh.com"), 1)

        const fallback = yield* connect({ extensions: [] })
        yield* Effect.scoped(Effect.flatMap(fallback.sftp.open("sync.txt", { flag: "w" }), (file) => file.sync))
        assert.isFalse(fallback.server.stats.requests.some((request) => request.startsWith("extended:")))
      }))

    it.effect("stat follows symbolic links and lstat does not", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("target.txt", "twelve bytes")
        tree.symlink("target.txt", "link")
        const followed = yield* sftp.stat("link")
        assert.strictEqual(followed.size, BigInt(12))
        assert.strictEqual(followed.permissions! & SftpServer.S_IFMT, SftpServer.S_IFREG)
        const link = yield* sftp.lstat("link")
        assert.strictEqual(link.permissions! & SftpServer.S_IFMT, SftpServer.S_IFLNK)
        assert.strictEqual(link.size, BigInt("target.txt".length))
        const directory = yield* sftp.stat(".")
        assert.strictEqual(directory.permissions! & SftpServer.S_IFMT, SftpServer.S_IFDIR)

        tree.symlink("nowhere", "dangling")
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.stat("dangling"))), Sftp.StatusCode.NO_SUCH_FILE)
        assert.strictEqual((yield* sftp.lstat("dangling")).permissions! & SftpServer.S_IFMT, SftpServer.S_IFLNK)
      }))
  })

  describe("directories", () => {
    it.effect("reads directories returned in several batches", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect({ readdirBatchSize: 100 })
        const names = Array.from({ length: 250 }, (_, i) => `file-${String(i).padStart(3, "0")}.txt`)
        for (const name of names) tree.writeFile(`many/${name}`, name)
        tree.makeDirectory("many/sub")
        const entries = yield* sftp.readDirectory("many")
        assert.deepStrictEqual(entries.map((entry) => entry.filename).sort(), [".", "..", ...names, "sub"].sort())
        // 252 entries in three batches, then EOF.
        assert.strictEqual(count(server.stats.requests, "readdir"), 4)
        assert.strictEqual(server.openHandles(), 0)
        const file = entries.find((entry) => entry.filename === "file-007.txt")!
        assert.strictEqual(file.attributes.size, BigInt("file-007.txt".length))
        assert.strictEqual(file.attributes.permissions! & SftpServer.S_IFMT, SftpServer.S_IFREG)
        assert.isTrue(file.longname.startsWith("-rw-r--r--"))
        assert.isTrue(file.longname.endsWith(" file-007.txt"))
        const sub = entries.find((entry) => entry.filename === "sub")!
        assert.isTrue(sub.longname.startsWith("d"))
      }))

    it.effect("fails to read files and missing paths as directories", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("plain.txt", "x")
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.readDirectory("plain.txt"))), Sftp.StatusCode.NO_SUCH_FILE)
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.readDirectory("missing"))), Sftp.StatusCode.NO_SUCH_FILE)
      }))

    it.effect("creates and removes directories and files", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        yield* sftp.makeDirectory("dir", { mode: 0o750 })
        assert.strictEqual(tree.lookup("dir")?.mode, SftpServer.S_IFDIR | 0o750)
        // OpenSSH reports existing paths as a generic failure.
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.makeDirectory("dir"))), Sftp.StatusCode.FAILURE)
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.makeDirectory("a/b"))), Sftp.StatusCode.NO_SUCH_FILE)

        yield* sftp.writeFile("dir/file.txt", bytes("x"))
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.removeDirectory("dir"))), Sftp.StatusCode.FAILURE)
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.remove("dir"))), Sftp.StatusCode.FAILURE)
        assert.strictEqual(
          sftpCode(yield* Effect.flip(sftp.removeDirectory("dir/file.txt"))),
          Sftp.StatusCode.NO_SUCH_FILE
        )
        yield* sftp.remove("dir/file.txt")
        assert.isFalse(tree.exists("dir/file.txt"))
        yield* sftp.removeDirectory("dir")
        assert.isFalse(tree.exists("dir"))
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.remove("dir/file.txt"))), Sftp.StatusCode.NO_SUCH_FILE)
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.removeDirectory("dir"))), Sftp.StatusCode.NO_SUCH_FILE)
      }))
  })

  describe("names", () => {
    it.effect("renames without replacing existing targets", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("a.txt", "a")
        tree.writeFile("b.txt", "b")
        const error = yield* Effect.flip(sftp.rename("a.txt", "b.txt"))
        assert.strictEqual(sftpCode(error), Sftp.StatusCode.FAILURE)
        assert.strictEqual(tree.readFileString("a.txt"), "a")
        assert.strictEqual(tree.readFileString("b.txt"), "b")
        yield* sftp.rename("a.txt", "c.txt")
        assert.isFalse(tree.exists("a.txt"))
        assert.strictEqual(tree.readFileString("c.txt"), "a")

        tree.writeFile("dir/inner.txt", "inner")
        yield* sftp.rename("dir", "moved")
        assert.strictEqual(tree.readFileString("moved/inner.txt"), "inner")
        tree.makeDirectory("occupied")
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.rename("moved", "occupied"))), Sftp.StatusCode.FAILURE)
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.rename("missing", "x"))), Sftp.StatusCode.NO_SUCH_FILE)
      }))

    it.effect("replaces targets with posix-rename@openssh.com", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect()
        tree.writeFile("a.txt", "a")
        tree.writeFile("b.txt", "b")
        yield* sftp.rename("a.txt", "b.txt", { overwrite: true })
        assert.isFalse(tree.exists("a.txt"))
        assert.strictEqual(tree.readFileString("b.txt"), "a")
        assert.strictEqual(count(server.stats.requests, "extended:posix-rename@openssh.com"), 1)
        tree.writeFile("dir/x", "x")
        tree.makeDirectory("empty")
        yield* sftp.rename("dir", "empty", { overwrite: true })
        assert.strictEqual(tree.readFileString("empty/x"), "x")
        tree.writeFile("file", "f")
        assert.strictEqual(
          sftpCode(yield* Effect.flip(sftp.rename("file", "empty", { overwrite: true }))),
          Sftp.StatusCode.FAILURE
        )
      }))

    it.effect("refuses to overwrite without posix-rename@openssh.com", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect({ extensions: [] })
        tree.writeFile("a.txt", "a")
        const error = yield* Effect.flip(sftp.rename("a.txt", "b.txt", { overwrite: true }))
        assert.strictEqual(sftpCode(error), Sftp.StatusCode.OP_UNSUPPORTED)
        assert.isFalse(server.stats.requests.includes("rename"))
        assert.isTrue(tree.exists("a.txt"))
      }))

    it.effect("creates and reads symbolic links", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("target.txt", "target")
        // Target first, then the link path (OpenSSH order).
        yield* sftp.symlink("target.txt", "link")
        const node = tree.lookup("link", { follow: false })
        assert.strictEqual(node?.type, "symlink")
        assert.strictEqual(node?.type === "symlink" ? node.target : undefined, "target.txt")
        assert.strictEqual(yield* sftp.readLink("link"), "target.txt")
        assert.strictEqual(text(yield* sftp.readFile("link")), "target")
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.symlink("other", "link"))), Sftp.StatusCode.FAILURE)
        // readlink on a regular file is EINVAL, reported as BAD_MESSAGE.
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.readLink("target.txt"))), Sftp.StatusCode.BAD_MESSAGE)
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.readLink("missing"))), Sftp.StatusCode.NO_SUCH_FILE)
      }))

    it.effect("creates hard links with hardlink@openssh.com", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("original.txt", "shared")
        yield* sftp.hardLink("original.txt", "hard.txt")
        yield* sftp.writeFile("hard.txt", bytes("changed"))
        assert.strictEqual(tree.readFileString("original.txt"), "changed")
        assert.strictEqual(tree.lookup("original.txt"), tree.lookup("hard.txt"))
        assert.strictEqual(
          sftpCode(yield* Effect.flip(sftp.hardLink("original.txt", "hard.txt"))),
          Sftp.StatusCode.FAILURE
        )
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.hardLink("missing", "x"))), Sftp.StatusCode.NO_SUCH_FILE)

        const fallback = yield* connect({ extensions: [] })
        fallback.tree.writeFile("original.txt", "x")
        const error = yield* Effect.flip(fallback.sftp.hardLink("original.txt", "hard.txt"))
        assert.strictEqual(sftpCode(error), Sftp.StatusCode.OP_UNSUPPORTED)
      }))

    it.effect("resolves real paths against the home directory", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.makeDirectory("sub")
        tree.writeFile("sub/file.txt", "x")
        tree.symlink("sub", "alias")
        assert.strictEqual(yield* sftp.realPath("."), "/home/tester")
        assert.strictEqual(yield* sftp.realPath(""), "/home/tester")
        assert.strictEqual(yield* sftp.realPath("sub/../sub/./file.txt"), "/home/tester/sub/file.txt")
        assert.strictEqual(yield* sftp.realPath("alias/file.txt"), "/home/tester/sub/file.txt")
        assert.strictEqual(yield* sftp.realPath("/tmp/../home//tester/"), "/home/tester")
        assert.strictEqual(yield* sftp.realPath("/../.."), "/")
        // Like OpenSSH, the final component does not need to exist.
        assert.strictEqual(yield* sftp.realPath("sub/new.txt"), "/home/tester/sub/new.txt")
        assert.strictEqual(sftpCode(yield* Effect.flip(sftp.realPath("missing/x"))), Sftp.StatusCode.NO_SUCH_FILE)
      }))
  })

  describe("transfers", () => {
    it.effect("pipelines multi-megabyte reads and writes in small chunks", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect({
          maxReadLength: 4096,
          maxWriteLength: 4096,
          reorderResponses: true
        })
        const data = pattern(2 * 1024 * 1024 + 123, 1)
        yield* sftp.writeFile("large.bin", data)
        assert.deepStrictEqual(tree.readFile("large.bin"), data)
        assert.strictEqual(server.stats.largestWrite, 4096)
        assert.strictEqual(count(server.stats.requests, "write"), Math.ceil(data.length / 4096))

        const read = yield* sftp.readFile("large.bin")
        assert.strictEqual(read.length, data.length)
        assert.deepStrictEqual(read, data)
        assert.strictEqual(server.stats.largestRead, 4096)
      }), { timeout: 60_000 })

    it.effect("keeps reading after short reads", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect({
          maxReadLength: 8192,
          shortRead: (offset, length) => (offset % 3 === 0 ? Math.ceil(length / 3) : length - 1)
        })
        const data = pattern(100_001, 2)
        tree.writeFile("short.bin", data)
        assert.deepStrictEqual(yield* sftp.readFile("short.bin"), data)
        const streamed = yield* Stream.runCollect(sftp.stream("short.bin", { chunkSize: 5000 }))
        assert.deepStrictEqual(concatAll(streamed), data)
        // Each chunk is read fully, despite the short reads.
        assert.deepStrictEqual(streamed.slice(0, -1).map((chunk) => chunk.length), Array(20).fill(5000))
      }))

    it.effect("reads empty and missing files", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect({ maxReadLength: 1000 })
        tree.writeFile("empty.bin", new Uint8Array(0))
        assert.strictEqual((yield* sftp.readFile("empty.bin")).length, 0)
        const missing = yield* Effect.flip(sftp.readFile("missing.bin"))
        assert.strictEqual(sftpCode(missing), Sftp.StatusCode.NO_SUCH_FILE)
      }))

    it.effect("streams ranges of a file", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect({ maxReadLength: 4096 })
        const data = pattern(50_000, 3)
        tree.writeFile("stream.bin", data)

        const whole = yield* Stream.runCollect(sftp.stream("stream.bin"))
        assert.deepStrictEqual(concatAll(whole), data)
        assert.isTrue(whole.every((chunk) => chunk.length <= 4096))

        const range = yield* Stream.runCollect(
          sftp.stream("stream.bin", { offset: BigInt(1000), bytesToRead: BigInt(20_000), chunkSize: 3000 })
        )
        assert.deepStrictEqual(concatAll(range), data.subarray(1000, 21_000))
        assert.deepStrictEqual(range.map((chunk) => chunk.length), [...Array(6).fill(3000), 2000])

        const tail = yield* Stream.runCollect(sftp.stream("stream.bin", { offset: BigInt(49_000), chunkSize: 300 }))
        assert.deepStrictEqual(concatAll(tail), data.subarray(49_000))

        const pastEnd = yield* Stream.runCollect(sftp.stream("stream.bin", { offset: BigInt(60_000) }))
        assert.strictEqual(pastEnd.length, 0)

        const beyond = yield* Stream.runCollect(
          sftp.stream("stream.bin", { offset: BigInt(45_000), bytesToRead: BigInt(10_000) })
        )
        assert.deepStrictEqual(concatAll(beyond), data.subarray(45_000))

        const head = yield* Stream.runCollect(Stream.take(sftp.stream("stream.bin", { chunkSize: 100 }), 2))
        assert.deepStrictEqual(concatAll(head), data.subarray(0, 200))

        const missing = yield* Effect.flip(Stream.runDrain(sftp.stream("missing.bin")))
        assert.strictEqual(sftpCode(missing), Sftp.StatusCode.NO_SUCH_FILE)
      }))

    it.effect("copies files with copy-data", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect()
        const data = pattern(70_000, 4)
        tree.writeFile("source.bin", data, { mode: 0o640 })
        tree.writeFile("target.bin", "old content that is longer than nothing")
        yield* sftp.copyFile("source.bin", "target.bin")
        assert.deepStrictEqual(tree.readFile("target.bin"), data)
        yield* sftp.copyFile("source.bin", "copy.bin")
        assert.deepStrictEqual(tree.readFile("copy.bin"), data)
        assert.strictEqual(tree.lookup("copy.bin")?.mode, SftpServer.S_IFREG | 0o640)
        assert.strictEqual(count(server.stats.requests, "extended:copy-data"), 2)
        assert.strictEqual(count(server.stats.requests, "read"), 0)
        assert.strictEqual(server.openHandles(), 0)
      }))

    it.effect("copies files by reading and writing without copy-data", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect({
          extensions: ["limits@openssh.com"],
          maxReadLength: 2048,
          maxWriteLength: 2048
        })
        const data = pattern(70_001, 5)
        tree.writeFile("source.bin", data, { mode: 0o600 })
        yield* sftp.copyFile("source.bin", "copy.bin")
        assert.deepStrictEqual(tree.readFile("copy.bin"), data)
        assert.strictEqual(tree.lookup("copy.bin")?.mode, SftpServer.S_IFREG | 0o600)
        assert.isFalse(server.stats.requests.includes("extended:copy-data"))
        assert.isAtLeast(count(server.stats.requests, "write"), Math.ceil(data.length / 2048))
        const missing = yield* Effect.flip(sftp.copyFile("missing.bin", "x.bin"))
        assert.strictEqual(sftpCode(missing), Sftp.StatusCode.NO_SUCH_FILE)
      }))

    it.effect("appends multi-chunk data in order", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect({ maxWriteLength: 1000 })
        tree.writeFile("log.bin", "head")
        const data = pattern(100_000, 8)
        yield* sftp.writeFile("log.bin", data, { flag: "a" })
        assert.deepStrictEqual(tree.readFile("log.bin"), concatAll([bytes("head"), data]))
      }))

    it.effect("closes the handle when a stream is not fully consumed", () =>
      Effect.gen(function*() {
        const { server, sftp, tree } = yield* connect({ maxReadLength: 1000 })
        tree.writeFile("stream.bin", pattern(100_000))
        const head = yield* Stream.runCollect(Stream.take(sftp.stream("stream.bin"), 1))
        assert.strictEqual(head[0].length, 1000)
        assert.strictEqual(server.openHandles(), 0)
      }))

    it.effect("copying a file onto itself keeps its content", () =>
      Effect.gen(function*() {
        const { sftp, tree } = yield* connect()
        tree.writeFile("same.txt", "precious")
        yield* Effect.ignore(sftp.copyFile("same.txt", "same.txt"))
        assert.strictEqual(tree.readFileString("same.txt"), "precious")
      }))

    it.effect("sends raw extended requests", () =>
      Effect.gen(function*() {
        const { sftp } = yield* connect({ maxReadLength: 1234, maxWriteLength: 4321 })
        const limits = yield* sftp.extended("limits@openssh.com")
        const view = new DataView(limits.buffer, limits.byteOffset, limits.byteLength)
        assert.strictEqual(limits.length, 32)
        assert.strictEqual(view.getBigUint64(8), BigInt(1234))
        assert.strictEqual(view.getBigUint64(16), BigInt(4321))
        const error = yield* Effect.flip(sftp.extended("unknown@example.com", new Uint8Array([1, 2, 3])))
        assert.strictEqual(sftpCode(error), Sftp.StatusCode.OP_UNSUPPORTED)
      }))
  })

  describe("errors", () => {
    it.effect("reports SFTP status codes as SshSftpError", () =>
      Effect.gen(function*() {
        const { sftp } = yield* connect()
        const error = yield* Effect.flip(sftp.stat("missing.txt"))
        assert.strictEqual(error._tag, "SshError")
        assert.strictEqual(error.reason._tag, "SshSftpError")
        if (error.reason._tag === "SshSftpError") {
          assert.strictEqual(error.reason.code, Sftp.StatusCode.NO_SUCH_FILE)
          assert.strictEqual(error.reason.method, "stat")
          assert.strictEqual(error.reason.path, "missing.txt")
          assert.strictEqual(error.reason.description, "No such file")
          assert.strictEqual(error.reason.message, "SFTP stat failed (missing.txt): No such file")
        }
      }))

    it.effect("fails pending and new requests when the channel closes", () =>
      Effect.gen(function*() {
        const server = SftpServer.make()
        const client = yield* connectClient(server)
        const sftp = yield* Effect.scoped(Sftp.make(Ssh.fromClient(client)))
        const error = yield* Effect.flip(sftp.stat("."))
        assert.strictEqual(error.reason._tag, "SshChannelError")
      }))
  })
})

describe("Sftp.fileSystem", () => {
  it.effect("is provided by Sftp.layerFileSystem", () =>
    Effect.gen(function*() {
      const server = SftpServer.make()
      server.fs.writeFile("hello.txt", "hello")
      const client = yield* connectClient(server)
      const content = yield* Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        return yield* fs.readFileString("hello.txt")
      }).pipe(Effect.provide(Layer.provide(Sftp.layerFileSystem, Layer.succeed(Ssh.Ssh, Ssh.fromClient(client)))))
      assert.strictEqual(content, "hello")
    }))

  it.effect("access and exists", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("file.txt", "x")
      tree.writeFile("secret.txt", "x", { mode: 0o000 })
      tree.writeFile("readonly.txt", "x", { mode: 0o444 })
      yield* fs.access("file.txt", { readable: true, writable: true })
      yield* fs.access("secret.txt")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.access("missing.txt"))), "NotFound")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.access("secret.txt", { readable: true }))), "PermissionDenied")
      yield* fs.access("readonly.txt", { readable: true })
      assert.strictEqual(
        reasonTag(yield* Effect.flip(fs.access("readonly.txt", { writable: true }))),
        "PermissionDenied"
      )
      assert.isTrue(yield* fs.exists("file.txt"))
      assert.isTrue(yield* fs.exists("."))
      assert.isFalse(yield* fs.exists("missing.txt"))
      tree.makeDirectory("locked", { mode: 0o000 })
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.exists("locked/file"))), "PermissionDenied")
    }))

  it.effect("copy copies directory trees", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("src/a.txt", "a", { mtime: 1_000_000, atime: 1_000_001 })
      tree.writeFile("src/sub/b.txt", "b")
      tree.makeDirectory("src/empty")
      tree.symlink("a.txt", "src/link")
      yield* fs.copy("src", "dst")
      assert.deepStrictEqual(tree.list("dst"), ["a.txt", "empty", "link", "sub"])
      assert.strictEqual(tree.readFileString("dst/a.txt"), "a")
      assert.strictEqual(tree.readFileString("dst/sub/b.txt"), "b")
      const link = tree.lookup("dst/link", { follow: false })
      assert.strictEqual(link?.type === "symlink" ? link.target : undefined, "a.txt")
      // Timestamps are not preserved by default.
      assert.notStrictEqual(tree.lookup("dst/a.txt")?.mtime, 1_000_000)

      assert.strictEqual(reasonTag(yield* Effect.flip(fs.copy("src", "dst"))), "AlreadyExists")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.copy("src/a.txt", "dst/a.txt"))), "AlreadyExists")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.copy("missing", "x"))), "NotFound")

      tree.writeFile("src/a.txt", "updated", { mtime: 1_000_000, atime: 1_000_001 })
      yield* fs.copy("src", "dst", { overwrite: true })
      assert.strictEqual(tree.readFileString("dst/a.txt"), "updated")

      yield* fs.copy("src", "preserved", { preserveTimestamps: true })
      assert.strictEqual(tree.lookup("preserved/a.txt")?.mtime, 1_000_000)
      assert.strictEqual(tree.lookup("preserved/a.txt")?.atime, 1_000_001)
      assert.strictEqual((yield* fs.stat("preserved/a.txt")).mtime.pipe(Option.getOrThrow).getTime(), 1_000_000_000)
    }))

  it.live("copy refuses to copy a directory into itself", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("src/sub/a.txt", "a")
      const error = yield* fs.copy("src", "src/sub/copy").pipe(Effect.timeout("1 second"), Effect.flip)
      assert.isTrue(PlatformError.isPlatformError(error))
    }))

  it.effect("copy with overwrite onto itself keeps the file", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("a.txt", "precious")
      const error = yield* Effect.flip(fs.copy("a.txt", "a.txt", { overwrite: true }))
      assert.strictEqual(reasonTag(error), "BadArgument")
      assert.strictEqual(tree.readFileString("a.txt"), "precious")
    }))

  it.effect("copyFile copies a single file", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("a.txt", "content")
      yield* fs.copyFile("a.txt", "b.txt")
      assert.strictEqual(tree.readFileString("b.txt"), "content")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.copyFile("missing.txt", "c.txt"))), "NotFound")
    }))

  it.effect("chmod and chown", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("file.txt", "x")
      yield* fs.chmod("file.txt", 0o700)
      assert.strictEqual((yield* fs.stat("file.txt")).mode, SftpServer.S_IFREG | 0o700)
      yield* fs.chown("file.txt", 1000, 42)
      const info = yield* fs.stat("file.txt")
      assert.deepStrictEqual(info.uid, Option.some(1000))
      assert.deepStrictEqual(info.gid, Option.some(42))
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.chown("file.txt", 0, 0))), "PermissionDenied")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.chmod("missing.txt", 0o600))), "NotFound")
      tree.writeFile("/tmp/root-owned", "x", { uid: 0, gid: 0 })
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.chmod("/tmp/root-owned", 0o777))), "PermissionDenied")
    }))

  it.effect("glob matches patterns", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      for (
        const path of [
          "a.txt",
          "b.txt",
          "c.txt",
          "ab.txt",
          "root.ts",
          "x/one.ts",
          "x/two.ts",
          "x/notes.md",
          "x/deep/three.ts",
          "y/four.ts"
        ]
      ) {
        tree.writeFile(path, path)
      }
      const glob = (pattern: string, options?: Parameters<FileSystem.FileSystem["glob"]>[1]) =>
        Effect.map(fs.glob(pattern, options), (paths) => paths.sort())
      assert.deepStrictEqual(yield* glob("**/*.ts"), [
        "root.ts",
        "x/deep/three.ts",
        "x/one.ts",
        "x/two.ts",
        "y/four.ts"
      ])
      assert.deepStrictEqual(yield* glob("x/*.ts"), ["x/one.ts", "x/two.ts"])
      assert.deepStrictEqual(yield* glob("{a,b}.txt"), ["a.txt", "b.txt"])
      assert.deepStrictEqual(yield* glob("?.txt"), ["a.txt", "b.txt", "c.txt"])
      assert.deepStrictEqual(yield* glob("**/*.ts", { exclude: ["x/**"] }), ["root.ts", "y/four.ts"])
      assert.deepStrictEqual(yield* glob("*.ts", { root: "x" }), ["one.ts", "two.ts"])
      assert.deepStrictEqual(yield* glob("**/*.ts", { root: "/home/tester/x" }), ["deep/three.ts", "one.ts", "two.ts"])
      assert.deepStrictEqual(yield* glob("missing/*.ts"), [])
    }))

  it.effect("link creates hard links", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("a.txt", "a")
      yield* fs.link("a.txt", "b.txt")
      assert.strictEqual(tree.lookup("a.txt"), tree.lookup("b.txt"))
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.link("missing.txt", "c.txt"))), "NotFound")
      const fallback = yield* connect({ extensions: [] })
      fallback.tree.writeFile("a.txt", "a")
      assert.strictEqual(reasonTag(yield* Effect.flip(fallback.fs.link("a.txt", "b.txt"))), "BadArgument")
    }))

  it.effect("makeDirectory", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      yield* fs.makeDirectory("plain", { mode: 0o700 })
      assert.strictEqual(tree.lookup("plain")?.mode, SftpServer.S_IFDIR | 0o700)
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.makeDirectory("plain"))), "AlreadyExists")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.makeDirectory("a/b/c"))), "NotFound")
      yield* fs.makeDirectory("a/b/c", { recursive: true })
      assert.strictEqual(tree.lookup("a/b/c")?.type, "directory")
      yield* fs.makeDirectory("a/b/c", { recursive: true })
      yield* fs.makeDirectory("/home/tester/abs/path", { recursive: true })
      assert.strictEqual(tree.lookup("abs/path")?.type, "directory")
      tree.writeFile("file.txt", "x")
      assert.strictEqual(
        reasonTag(yield* Effect.flip(fs.makeDirectory("file.txt", { recursive: true }))),
        "AlreadyExists"
      )
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.makeDirectory("file.txt"))), "AlreadyExists")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.makeDirectory("/nope"))), "PermissionDenied")
    }))

  it.effect("makeTempDirectory and makeTempDirectoryScoped", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      const directory = yield* fs.makeTempDirectory({ prefix: "test-" })
      assert.isTrue(directory.startsWith("/tmp/test-"))
      assert.strictEqual(tree.lookup(directory)?.mode, SftpServer.S_IFDIR | 0o700)
      const nested = yield* fs.makeTempDirectory({ directory: "work" }).pipe(
        Effect.flip,
        Effect.map(reasonTag)
      )
      assert.strictEqual(nested, "NotFound")
      tree.makeDirectory("work")
      const inWork = yield* fs.makeTempDirectory({ directory: "work" })
      assert.isTrue(inWork.startsWith("work/"))
      assert.strictEqual(tree.lookup(inWork)?.type, "directory")

      const scoped = yield* Effect.scoped(Effect.gen(function*() {
        const path = yield* fs.makeTempDirectoryScoped()
        yield* fs.writeFileString(`${path}/file.txt`, "x")
        assert.isTrue(tree.exists(`${path}/file.txt`))
        return path
      }))
      assert.isFalse(tree.exists(scoped))
    }))

  it.effect("makeTempFile and makeTempFileScoped", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      const file = yield* fs.makeTempFile({ suffix: ".json" })
      assert.isTrue(file.startsWith("/tmp/"))
      assert.isTrue(file.endsWith(".json"))
      assert.strictEqual(tree.readFile(file).length, 0)
      const scoped = yield* Effect.scoped(Effect.gen(function*() {
        const path = yield* fs.makeTempFileScoped({ prefix: "p-" })
        assert.isTrue(tree.exists(path))
        return path
      }))
      assert.isFalse(tree.exists(scoped))
      assert.isFalse(tree.exists(scoped.slice(0, scoped.lastIndexOf("/"))))
    }))

  it.effect("open returns a positioned File", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      yield* Effect.scoped(Effect.gen(function*() {
        const file = yield* fs.open("file.txt", { flag: "w+" })
        assert.strictEqual(yield* file.write(bytes("hello ")), 6)
        yield* file.writeAll(bytes("world"))
        assert.strictEqual(yield* file.seek(BigInt(0), "start"), BigInt(0))
        assert.deepStrictEqual(Option.map(yield* file.readAlloc(5), text), Option.some("hello"))
        const buffer = new Uint8Array(3)
        assert.strictEqual(yield* file.read(buffer), 3)
        assert.strictEqual(text(buffer), " wo")
        assert.strictEqual(yield* file.seek(BigInt(-2), "current"), BigInt(6))
        assert.deepStrictEqual(Option.map(yield* file.readAlloc(100), text), Option.some("world"))
        assert.isTrue(Option.isNone(yield* file.readAlloc(10)))
        assert.strictEqual(yield* file.read(new Uint8Array(4)), 0)
        assert.isTrue(Option.isNone(yield* file.readAlloc(0)))

        // Explicit positions leave the cursor alone.
        assert.deepStrictEqual(
          Option.map(yield* file.readAlloc(4, { position: BigInt(1) }), text),
          Option.some("ello")
        )
        const positioned = new Uint8Array(2)
        assert.strictEqual(yield* file.read(positioned, { position: BigInt(9) }), 2)
        assert.strictEqual(text(positioned), "ld")
        assert.strictEqual(yield* file.seek(BigInt(0), "current"), BigInt(11))

        assert.strictEqual(reasonTag(yield* Effect.flip(file.seek(BigInt(-20), "current"))), "BadArgument")
        assert.strictEqual(
          reasonTag(yield* Effect.flip(file.read(new Uint8Array(1), { position: BigInt(-1) }))),
          "BadArgument"
        )
        assert.strictEqual(reasonTag(yield* Effect.flip(file.readAlloc(1, { position: BigInt(-1) }))), "BadArgument")

        const info = yield* file.stat
        assert.strictEqual(info.type, "File")
        assert.strictEqual(info.size, BigInt(11))

        yield* file.truncate(5)
        assert.strictEqual(yield* file.seek(BigInt(0), "current"), BigInt(5))
        yield* file.writeAll(bytes("!"))
        yield* file.sync
        assert.strictEqual((yield* file.stat).size, BigInt(6))
        yield* file.truncate()
        assert.strictEqual((yield* file.stat).size, BigInt(0))
      }))
      assert.strictEqual(tree.readFileString("file.txt"), "")

      tree.writeFile("log.txt", "start")
      yield* Effect.scoped(Effect.gen(function*() {
        const file = yield* fs.open("log.txt", { flag: "a+" })
        yield* file.writeAll(bytes("-one"))
        yield* file.seek(BigInt(0), "start")
        yield* file.writeAll(bytes("-two"))
        assert.deepStrictEqual(Option.map(yield* file.readAlloc(5), text), Option.some("start"))
      }))
      assert.strictEqual(tree.readFileString("log.txt"), "start-one-two")

      yield* Effect.scoped(Effect.gen(function*() {
        const file = yield* fs.open("log.txt")
        assert.strictEqual(reasonTag(yield* Effect.flip(file.writeAll(bytes("x")))), "NotFound")
      }))

      yield* Effect.scoped(fs.open("private.txt", { flag: "wx", mode: 0o600 }))
      assert.strictEqual(tree.lookup("private.txt")?.mode, SftpServer.S_IFREG | 0o600)
      assert.strictEqual(reasonTag(yield* Effect.flip(Effect.scoped(fs.open("missing.txt")))), "NotFound")
      assert.strictEqual(
        reasonTag(yield* Effect.flip(Effect.scoped(fs.open("private.txt", { flag: "wx" })))),
        "Unknown"
      )

      tree.symlink("log.txt", "log-link")
      yield* Effect.scoped(fs.open("log-link"))
      assert.strictEqual(
        reasonTag(yield* Effect.flip(Effect.scoped(fs.open("log-link", { noFollow: true })))),
        "Unknown"
      )
      yield* Effect.scoped(fs.open("log.txt", { noFollow: true }))
    }))

  it.effect("readDirectory", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("dir/a.txt", "a")
      tree.writeFile("dir/sub/b.txt", "b")
      tree.writeFile("dir/sub/deeper/c.txt", "c")
      assert.deepStrictEqual((yield* fs.readDirectory("dir")).sort(), ["a.txt", "sub"])
      assert.deepStrictEqual((yield* fs.readDirectory("dir", { recursive: true })).sort(), [
        "a.txt",
        "sub",
        "sub/b.txt",
        "sub/deeper",
        "sub/deeper/c.txt"
      ])
      assert.deepStrictEqual((yield* fs.readDirectory("/home/tester/dir/sub/")).sort(), ["b.txt", "deeper"])
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.readDirectory("missing"))), "NotFound")
    }))

  it.effect("reads and writes files and strings", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect({ maxReadLength: 1000, maxWriteLength: 1000 })
      const data = pattern(12_345, 6)
      yield* fs.writeFile("data.bin", data)
      assert.deepStrictEqual(tree.readFile("data.bin"), data)
      assert.deepStrictEqual(yield* fs.readFile("data.bin"), data)
      yield* fs.writeFileString("text.txt", "héllo wörld")
      assert.strictEqual(yield* fs.readFileString("text.txt"), "héllo wörld")
      yield* fs.writeFileString("text.txt", "!", { flag: "a" })
      assert.strictEqual(tree.readFileString("text.txt"), "héllo wörld!")
      yield* fs.writeFileString("text.txt", "short")
      assert.strictEqual(tree.readFileString("text.txt"), "short")
      yield* fs.writeFile("mode.txt", bytes("x"), { mode: 0o600 })
      assert.strictEqual(tree.lookup("mode.txt")?.mode, SftpServer.S_IFREG | 0o600)
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.writeFileString("text.txt", "x", { flag: "wx" }))), "Unknown")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.readFile("missing.txt"))), "NotFound")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.writeFile("missing/file.txt", data))), "NotFound")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.writeFile("/root.txt", data))), "PermissionDenied")
      assert.strictEqual(
        reasonTag(yield* Effect.flip(fs.readFileString("text.txt", "no-such-encoding"))),
        "BadArgument"
      )
    }))

  it.effect("symlink, readLink, and realPath", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("dir/target.txt", "x")
      yield* fs.symlink("dir/target.txt", "link")
      assert.strictEqual(yield* fs.readLink("link"), "dir/target.txt")
      assert.strictEqual(yield* fs.realPath("link"), "/home/tester/dir/target.txt")
      assert.strictEqual(yield* fs.realPath("dir/../dir/./target.txt"), "/home/tester/dir/target.txt")
      assert.strictEqual(yield* fs.realPath("."), "/home/tester")
      assert.strictEqual(yield* fs.readFileString("link"), "x")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.symlink("anything", "link"))), "Unknown")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.readLink("missing"))), "NotFound")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.realPath("missing/deeper"))), "NotFound")
    }))

  it.effect("remove", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect({ readdirBatchSize: 3 })
      tree.writeFile("file.txt", "x")
      yield* fs.remove("file.txt")
      assert.isFalse(tree.exists("file.txt"))
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.remove("file.txt"))), "NotFound")
      yield* fs.remove("file.txt", { force: true })

      for (let i = 0; i < 10; i++) tree.writeFile(`tree/sub-${i % 3}/file-${i}.txt`, "x")
      tree.makeDirectory("tree/empty")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.remove("tree"))), "BadResource")
      assert.isTrue(tree.exists("tree"))

      // Removing a link to a directory removes only the link.
      tree.symlink("tree", "tree-link")
      yield* fs.remove("tree-link")
      assert.isFalse(tree.exists("tree-link"))
      assert.isTrue(tree.exists("tree/sub-0/file-0.txt"))

      yield* fs.remove("tree", { recursive: true })
      assert.isFalse(tree.exists("tree"))
      tree.makeDirectory("empty")
      yield* fs.remove("empty", { recursive: true })
      assert.isFalse(tree.exists("empty"))
    }))

  it.effect("rename overwrites existing targets", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("a.txt", "a")
      tree.writeFile("b.txt", "b")
      yield* fs.rename("a.txt", "b.txt")
      assert.isFalse(tree.exists("a.txt"))
      assert.strictEqual(tree.readFileString("b.txt"), "a")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.rename("missing.txt", "c.txt"))), "NotFound")

      const fallback = yield* connect({ extensions: [] })
      fallback.tree.writeFile("a.txt", "a")
      fallback.tree.writeFile("b.txt", "b")
      // Without posix-rename@openssh.com, existing targets cannot be replaced.
      assert.strictEqual(reasonTag(yield* Effect.flip(fallback.fs.rename("a.txt", "b.txt"))), "Unknown")
      yield* fallback.fs.rename("a.txt", "c.txt")
      assert.strictEqual(fallback.tree.readFileString("c.txt"), "a")
    }))

  it.effect("stat reports types, sizes, and times", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("file.txt", "12345", { mtime: 1_700_000_000, atime: 1_600_000_000 })
      tree.makeDirectory("dir")
      tree.symlink("file.txt", "link")
      tree.symlink("missing", "dangling")
      const file = yield* fs.stat("file.txt")
      assert.strictEqual(file.type, "File")
      assert.strictEqual(file.size, BigInt(5))
      assert.deepStrictEqual(file.mtime, Option.some(new Date(1_700_000_000_000)))
      assert.deepStrictEqual(file.atime, Option.some(new Date(1_600_000_000_000)))
      assert.strictEqual(file.mode, SftpServer.S_IFREG | 0o644)
      assert.deepStrictEqual(file.uid, Option.some(1000))
      assert.isTrue(Option.isNone(file.birthtime))
      assert.strictEqual((yield* fs.stat("dir")).type, "Directory")
      // stat follows symbolic links.
      assert.strictEqual((yield* fs.stat("link")).type, "File")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.stat("dangling"))), "NotFound")
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.stat("missing"))), "NotFound")
    }))

  it.effect("truncate and utimes", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect()
      tree.writeFile("file.txt", "0123456789")
      yield* fs.truncate("file.txt", 4)
      assert.strictEqual(tree.readFileString("file.txt"), "0123")
      yield* fs.truncate("file.txt", 6)
      assert.deepStrictEqual(tree.readFile("file.txt"), new Uint8Array([48, 49, 50, 51, 0, 0]))
      yield* fs.truncate("file.txt")
      assert.strictEqual(tree.readFile("file.txt").length, 0)
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.truncate("missing.txt"))), "NotFound")

      yield* fs.utimes("file.txt", new Date(1_500_000_000_500), 1_600_000_000_999)
      const node = tree.lookup("file.txt")
      assert.strictEqual(node?.atime, 1_500_000_000)
      assert.strictEqual(node?.mtime, 1_600_000_000)
      assert.strictEqual(reasonTag(yield* Effect.flip(fs.utimes("missing.txt", 0, 0))), "NotFound")
    }))

  it.effect("watch is not supported", () =>
    Effect.gen(function*() {
      const { fs } = yield* connect()
      const error = yield* Effect.flip(Stream.runDrain(fs.watch(".")))
      assert.strictEqual(reasonTag(error), "BadArgument")
    }))

  it.effect("stream and sink", () =>
    Effect.gen(function*() {
      const { fs, tree } = yield* connect({ maxReadLength: 2048, maxWriteLength: 2048 })
      const data = pattern(30_000, 7)
      tree.writeFile("data.bin", data)
      assert.deepStrictEqual(concatAll(yield* Stream.runCollect(fs.stream("data.bin"))), data)
      const range = yield* Stream.runCollect(fs.stream("data.bin", { offset: 100, bytesToRead: 5000, chunkSize: 1000 }))
      assert.deepStrictEqual(concatAll(range), data.subarray(100, 5100))
      assert.deepStrictEqual(range.map((chunk) => chunk.length), [1000, 1000, 1000, 1000, 1000])
      assert.strictEqual(reasonTag(yield* Effect.flip(Stream.runDrain(fs.stream("missing.bin")))), "NotFound")

      yield* Stream.make(bytes("one,"), bytes("two,"), bytes("three")).pipe(Stream.run(fs.sink("out.txt")))
      assert.strictEqual(tree.readFileString("out.txt"), "one,two,three")
      yield* Stream.make(bytes("!")).pipe(Stream.run(fs.sink("out.txt", { flag: "a" })))
      assert.strictEqual(tree.readFileString("out.txt"), "one,two,three!")
      yield* Stream.fromIterable([data.subarray(0, 10_000), data.subarray(10_000)]).pipe(
        Stream.run(fs.sink("copy.bin", { mode: 0o600 }))
      )
      assert.deepStrictEqual(tree.readFile("copy.bin"), data)
      assert.strictEqual(tree.lookup("copy.bin")?.mode, SftpServer.S_IFREG | 0o600)
      const sinkError = yield* Effect.flip(Stream.make(bytes("x")).pipe(Stream.run(fs.sink("missing/out.txt"))))
      assert.strictEqual(reasonTag(sinkError), "NotFound")
    }))
})
