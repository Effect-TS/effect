import { Git } from "@effect/release/Git"
import { GitHub } from "@effect/release/GitHub"
import { Pnpm } from "@effect/release/Pnpm"
import * as Process from "@effect/release/Process"
import { Registry } from "@effect/release/Registry"
import * as ReleasePlan from "@effect/release/ReleasePlan"
import { Workspace } from "@effect/release/Workspace"
import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

interface CommandOutput {
  readonly stdout?: string
  readonly stderr?: string
  readonly exitCode?: number
}

const encoder = new TextEncoder()

const processLayer = (
  outputs: Array<CommandOutput>,
  commands: Array<ChildProcess.StandardCommand>
) =>
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make((command) => {
      assert.isTrue(ChildProcess.isStandardCommand(command))
      if (!ChildProcess.isStandardCommand(command)) return Effect.die("expected a standard command")
      commands.push(command)
      const output = outputs.shift()
      if (output === undefined) {
        return Effect.die(
          `unexpected command: ${command.command} ${command.args.join(" ")}`
        )
      }
      const stdout = Stream.make(encoder.encode(output.stdout ?? ""))
      const stderr = Stream.make(encoder.encode(output.stderr ?? ""))
      return Effect.succeed(ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(commands.length),
        stdin: Sink.drain,
        stdout,
        stderr,
        all: Stream.merge(stdout, stderr),
        exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(output.exitCode ?? 0)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void)
      }))
    })
  )

const workspaceFileSystem = (overrides: Parameters<typeof FileSystem.layerNoop>[0] = {}) =>
  FileSystem.layerNoop({
    exists: (location) => Effect.succeed(location.endsWith("pnpm-workspace.yaml")),
    ...overrides
  })

const commandDependencies = (
  outputs: Array<CommandOutput>,
  commands: Array<ChildProcess.StandardCommand>,
  fs = workspaceFileSystem()
) => Layer.mergeAll(fs, Path.layer, processLayer(outputs, commands))

const pullRequestJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    number: 8342,
    url: "https://github.com/Effect-TS/effect/pull/8342",
    headRefName: "changeset-release/main",
    baseRefName: "main",
    title: "Version Packages (rc)",
    body: "release body",
    ...overrides
  })

describe("Pnpm layer", () => {
  it.effect("parses stage output and passes one exact filter per package", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const pnpm = yield* Pnpm
      const staged = yield* pnpm.stagePublish({
        tag: "rc",
        packages: ["effect", "@effect/vitest"],
        dryRun: true
      })

      assert.deepStrictEqual(commands[0].args, [
        "stage",
        "publish",
        "-r",
        "--tag",
        "rc",
        "--no-git-checks",
        "--json",
        "--dry-run",
        "--filter",
        "effect",
        "--filter",
        "@effect/vitest"
      ])
      assert.strictEqual(commands[0].options.stdin, "ignore")
      assert.deepStrictEqual(staged.map((item) => [item.name, item.version, Option.getOrUndefined(item.stageId)]), [
        ["effect", "4.0.0-rc.118", "stage-effect"],
        ["@effect/vitest", "4.0.0-rc.118", undefined]
      ])
    }).pipe(Effect.provide(Pnpm.layer.pipe(
      Layer.provide(commandDependencies([{
        stdout: JSON.stringify({
          effect: {
            id: "effect@4.0.0-rc.118",
            name: "effect",
            version: "4.0.0-rc.118",
            size: 2438912,
            unpackedSize: 11319222,
            shasum: "339deaedfc5fe1431a76352f0c493ec890ceec7d",
            integrity: "sha512-real-stage-output",
            filename: "effect-4.0.0-rc.118.tgz",
            files: [{ path: "package.json", size: 4321, mode: 420 }],
            entryCount: 1570,
            bundled: [],
            stageId: "stage-effect"
          },
          vitest: {
            id: "@effect/vitest@4.0.0-rc.118",
            name: "@effect/vitest",
            version: "4.0.0-rc.118",
            size: 12345,
            unpackedSize: 45678,
            shasum: "6f1ed002ab5595859014ebf0951522d9f7ee292e",
            integrity: "sha512-real-stage-output",
            filename: "effect-vitest-4.0.0-rc.118.tgz",
            files: [{ path: "package.json", size: 987, mode: 420 }],
            entryCount: 42,
            bundled: []
          }
        })
      }], commands))
    )))
  })

  it.effect("does not spawn pnpm for an empty stage set", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const pnpm = yield* Pnpm
      assert.deepStrictEqual(yield* pnpm.stagePublish({ tag: "rc", packages: [] }), [])
      assert.deepStrictEqual(commands, [])
    }).pipe(Effect.provide(Pnpm.layer.pipe(Layer.provide(commandDependencies([], commands)))))
  })

  it.effect("maps pnpm's no-pending response to no applied versions", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const pnpm = yield* Pnpm
      assert.deepStrictEqual(yield* pnpm.applyVersions, [])
      assert.deepStrictEqual(commands[0].args, ["version", "-r", "--json"])
    }).pipe(Effect.provide(Pnpm.layer.pipe(Layer.provide(commandDependencies([
      { stdout: ReleasePlan.NO_PENDING_CHANGES + "\n" }
    ], commands)))))
  })

  it.effect("maps a warning-prefixed no-pending response to no applied versions", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const pnpm = yield* Pnpm
      assert.deepStrictEqual(yield* pnpm.applyVersions, [])
    }).pipe(Effect.provide(Pnpm.layer.pipe(Layer.provide(commandDependencies([{
      stdout: `WARN  The current working tree has uncommitted changes\n${ReleasePlan.NO_PENDING_CHANGES}\n`
    }], commands)))))
  })
})

describe("Git layer", () => {
  it.effect("returns none when the staged tree is clean", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const git = yield* Git
      assert.deepStrictEqual(yield* git.commitAll("Version Packages"), Option.none())
      assert.deepStrictEqual(commands.map((command) => command.args), [
        ["add", "-A"],
        ["diff", "--cached", "--quiet"]
      ])
    }).pipe(Effect.provide(Git.layer.pipe(Layer.provide(commandDependencies([{}, {}], commands)))))
  })

  it.effect("commits and returns HEAD only when git diff exits one", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const git = yield* Git
      assert.deepStrictEqual(yield* git.commitAll("Version Packages"), Option.some("abc123"))
      assert.deepStrictEqual(commands.map((command) => command.args), [
        ["add", "-A"],
        ["diff", "--cached", "--quiet"],
        ["commit", "--message", "Version Packages"],
        ["rev-parse", "HEAD"]
      ])
    }).pipe(Effect.provide(Git.layer.pipe(Layer.provide(commandDependencies([
      {},
      { exitCode: 1 },
      {},
      { stdout: "abc123\n" }
    ], commands)))))
  })

  it.effect("fails without committing when git diff exits unexpectedly", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const git = yield* Git
      const error = yield* Effect.flip(git.commitAll("Version Packages"))
      assert.include(error.message, "exited 2: broken index")
      assert.deepStrictEqual(commands.map((command) => command.args), [
        ["add", "-A"],
        ["diff", "--cached", "--quiet"]
      ])
    }).pipe(Effect.provide(Git.layer.pipe(Layer.provide(commandDependencies([
      {},
      { exitCode: 2, stderr: "broken index\n" }
    ], commands)))))
  })
})

describe("GitHub layer", () => {
  it.effect("parses pr list output using the documented head and base", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    return Effect.gen(function*() {
      const github = yield* GitHub
      const found = yield* github.findPullRequest({ head: "changeset-release/main", base: "main" })
      assert.strictEqual(Option.getOrThrow(found).number, 8342)
      assert.deepStrictEqual(commands[0].args, [
        "pr",
        "list",
        "--state",
        "open",
        "--head",
        "changeset-release/main",
        "--base",
        "main",
        "--limit",
        "1",
        "--json",
        "number,url,headRefName,baseRefName,title,body"
      ])
    }).pipe(Effect.provide(GitHub.layer.pipe(Layer.provide(commandDependencies([
      { stdout: `[${pullRequestJson()}]` }
    ], commands)))))
  })

  it.effect("writes the create body to a temporary file and parses the follow-up view", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    const writes: Array<readonly [string, string]> = []
    const fs = workspaceFileSystem({
      makeTempFileScoped: () => Effect.succeed("/tmp/effect-release-body.md"),
      writeFileString: (path, body) => Effect.sync(() => void writes.push([path, body]))
    })
    return Effect.gen(function*() {
      const github = yield* GitHub
      const created = yield* github.createPullRequest({
        head: "changeset-release/main",
        base: "main",
        title: "Version Packages (rc)",
        body: "line one\nline two"
      })
      assert.strictEqual(created.number, 8342)
      assert.deepStrictEqual(writes, [["/tmp/effect-release-body.md", "line one\nline two"]])
      assert.deepStrictEqual(commands.map((command) => command.args), [
        [
          "pr",
          "create",
          "--head",
          "changeset-release/main",
          "--base",
          "main",
          "--title",
          "Version Packages (rc)",
          "--body-file",
          "/tmp/effect-release-body.md"
        ],
        ["pr", "view", "changeset-release/main", "--json", "number,url,headRefName,baseRefName,title,body"]
      ])
    }).pipe(Effect.provide(GitHub.layer.pipe(Layer.provide(commandDependencies(
      [
        { stdout: "https://github.com/Effect-TS/effect/pull/8342\n" },
        { stdout: pullRequestJson() }
      ],
      commands,
      fs
    )))))
  })
})

describe("Registry layer", () => {
  it.effect("maps 200 and 404 to publication state and rejects other statuses", () => {
    const statuses = [200, 404, 503]
    const requests: Array<HttpClientRequest.HttpClientRequest> = []
    const client = HttpClient.make((request) => {
      requests.push(request)
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response("", { status: statuses.shift()! })))
    })
    return Effect.gen(function*() {
      const registry = yield* Registry
      assert.isTrue(yield* registry.isPublished("@effect/vitest", "4.0.0-rc.118"))
      assert.isFalse(yield* registry.isPublished("effect", "4.0.0-rc.118"))
      const error = yield* Effect.flip(registry.isPublished("effect", "4.0.0-rc.119"))
      assert.include(error.message, "Unexpected status 503")
      assert.strictEqual(requests[0].url, "https://registry.npmjs.org/@effect%2Fvitest/4.0.0-rc.118")
    }).pipe(Effect.provide(Registry.layer.pipe(
      Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
    )))
  })

  it.effect("paginates the stage queue and sends stage authentication headers", () => {
    const requests: Array<HttpClientRequest.HttpClientRequest> = []
    const first = Array.from({ length: 100 }, (_, index) => ({
      id: `stage-${index}`,
      packageName: `package-${index}`,
      version: "1.0.0"
    }))
    const pages = [
      { items: first, total: 101 },
      {
        items: [{ id: "stage-100", packageName: "package-100", version: "1.0.0", tag: "rc", status: "staged" }],
        total: 101
      }
    ]
    const client = HttpClient.make((request) => {
      requests.push(request)
      return Effect.succeed(HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(pages.shift()), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      ))
    })
    return Effect.gen(function*() {
      const registry = yield* Registry
      const items = yield* registry.listStaged
      assert.strictEqual(items.length, 101)
      assert.deepStrictEqual(items[100], {
        id: "stage-100",
        packageName: "package-100",
        version: "1.0.0",
        tag: Option.some("rc"),
        status: Option.some("staged")
      })
      assert.include(requests[0].url, "page=0&perPage=100")
      assert.include(requests[1].url, "page=1&perPage=100")
      assert.strictEqual(requests[0].headers.authorization, "Bearer stage-token")
      assert.strictEqual(requests[0].headers["npm-auth-type"], "web")
      assert.strictEqual(requests[0].headers["npm-command"], "stage")
    }).pipe(
      Effect.provide(Registry.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env: { NPM_STAGE_TOKEN: "stage-token" } })))
    )
  })

  it.effect("warns and skips HTTP when the stage token is absent", () => {
    let requests = 0
    const errors: Array<unknown> = []
    const client = HttpClient.make(() => {
      requests++
      return Effect.die("HTTP should not run")
    })
    const testConsole: Console.Console = Object.assign(Object.create(console), {
      error: (...args: ReadonlyArray<unknown>) => errors.push(...args)
    })
    return Effect.gen(function*() {
      const registry = yield* Registry
      assert.deepStrictEqual(yield* registry.listStaged, [])
      assert.strictEqual(requests, 0)
      assert.deepStrictEqual(errors, ["warning: NPM_STAGE_TOKEN is not set; treating the stage queue as empty"])
    }).pipe(
      Effect.provide(Registry.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env: {} }))),
      Effect.provideService(Console.Console, testConsole)
    )
  })

  it.effect("returns an authenticated empty stage queue", () => {
    const requests: Array<HttpClientRequest.HttpClientRequest> = []
    const client = HttpClient.make((request) => {
      requests.push(request)
      return Effect.succeed(HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify({ items: [], total: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      ))
    })
    return Effect.gen(function*() {
      const registry = yield* Registry
      assert.deepStrictEqual(yield* registry.listStaged, [])
      assert.lengthOf(requests, 1)
      assert.strictEqual(requests[0].headers.authorization, "Bearer stage-token")
    }).pipe(
      Effect.provide(Registry.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env: { NPM_STAGE_TOKEN: "stage-token" } })))
    )
  })

  it.effect("fails closed when the stage queue stops before its reported total", () => {
    const client = HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(
        request,
        new Response(
          JSON.stringify({
            items: [{ id: "stage-0", packageName: "effect", version: "4.0.0-rc.118" }],
            total: 2
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      ))
    )
    return Effect.gen(function*() {
      const registry = yield* Registry
      const error = yield* Effect.flip(registry.listStaged)
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "2")
    }).pipe(
      Effect.provide(Registry.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env: { NPM_STAGE_TOKEN: "stage-token" } })))
    )
  })
})

describe("Workspace layer", () => {
  it.effect("drops the nameless root and returns workspace-relative package directories", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    const root = globalThis.process.cwd()
    const output = JSON.stringify([
      { path: root, private: true },
      { name: "effect", version: "4.0.0-rc.118", path: `${root}/packages/effect` },
      { name: "@effect/release", version: "0.0.0", path: `${root}/packages/tools/release`, private: true }
    ])
    return Effect.gen(function*() {
      const workspace = yield* Workspace
      assert.deepStrictEqual(yield* workspace.packages, [
        { name: "effect", version: "4.0.0-rc.118", dir: "packages/effect", private: false },
        { name: "@effect/release", version: "0.0.0", dir: "packages/tools/release", private: true }
      ])
      assert.deepStrictEqual(commands[0].args, ["-r", "ls", "--depth", "-1", "--json"])
    }).pipe(Effect.provide(Workspace.layer.pipe(Layer.provide(commandDependencies([{ stdout: output }], commands)))))
  })

  it.effect("rejects a named workspace package without a version", () => {
    const commands: Array<ChildProcess.StandardCommand> = []
    const root = globalThis.process.cwd()
    const output = JSON.stringify([
      { path: root, private: true },
      { name: "missing-version", path: `${root}/packages/missing` }
    ])
    return Effect.gen(function*() {
      const workspace = yield* Workspace
      const error = yield* Effect.flip(workspace.packages)
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "missing-version")
    }).pipe(Effect.provide(Workspace.layer.pipe(Layer.provide(commandDependencies([{ stdout: output }], commands)))))
  })
})

describe("Process.findWorkspaceRoot", () => {
  it.effect("fails after reaching the filesystem root", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(Process.findWorkspaceRoot)
      assert.strictEqual(error._tag, "ReleaseError")
      assert.include(error.message, "Could not find pnpm-workspace.yaml")
    }).pipe(Effect.provide(Layer.mergeAll(
      FileSystem.layerNoop({ exists: () => Effect.succeed(false) }),
      Path.layer
    ))))
})
