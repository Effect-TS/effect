import * as RivetCluster from "@effect/platform-rivet/RivetCluster"
import { Effect, type Layer } from "effect"
import type { Sharding } from "effect/cluster"
import type * as Scope from "effect/Scope"
import { type ChildProcess, spawn } from "node:child_process"
import * as fs from "node:fs"
import { createRequire } from "node:module"
import * as os from "node:os"
import * as path from "node:path"
import { createClient } from "rivetkit/client"
import { Ledger } from "./Ledger.ts"

const token = "dev"
const endpoint = "http://127.0.0.1:6420"

const enginePath = (): string => {
  const require = createRequire(import.meta.url)
  const engineCli = createRequire(require.resolve("rivetkit"))("@rivetkit/engine-cli") as {
    readonly getEnginePath: () => string
  }
  return engineCli.getEnginePath()
}

/**
 * How long the engine waits before it declares a silent node lost and
 * reschedules its actors. The suite shortens it to keep runs fast; set
 * EFFECT_RIVET_NODE_LOST_THRESHOLD=default to measure the engine default.
 */
export const nodeLostThreshold = process.env.EFFECT_RIVET_NODE_LOST_THRESHOLD ?? "5000"

export interface FixtureEvent {
  readonly event: string
  readonly node: string
  readonly at: number
  readonly op?: string
  readonly rpc?: string
  readonly key?: ReadonlyArray<string>
}

export const wrote = (op: string, node: string) => (event: FixtureEvent) =>
  event.event === "wrote" && event.op === op && event.node === node

export interface Node {
  readonly name: string
  readonly pid: number
  /** Sends a signal to the node process. */
  readonly signal: (signal: NodeJS.Signals) => Effect.Effect<void>
  readonly log: () => string
}

export interface Cluster {
  readonly startNode: (name: string, options?: { readonly hold?: boolean }) => Effect.Effect<Node>
  readonly events: () => ReadonlyArray<FixtureEvent>
  /**
   * Polls the fixture event log until `predicate` matches, failing with
   * `description`, the event log and the node logs after the deadline.
   */
  readonly waitForEvent: (
    description: string,
    predicate: (event: FixtureEvent) => boolean,
    timeoutMillis?: number
  ) => Effect.Effect<FixtureEvent>
  /** Makes the next actor wake on any node fail once. */
  readonly failNextWake: Effect.Effect<void>
  /** `Sharding` for the test process, as a client of the nodes. */
  readonly layer: Layer.Layer<Sharding.Sharding>
}

const waitFor = async (description: string, check: () => Promise<boolean> | boolean, timeoutMillis: number) => {
  const deadline = Date.now() + timeoutMillis
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error(description)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

const stop = (child: ChildProcess) =>
  new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve()
    child.once("exit", () => resolve())
    child.kill("SIGCONT")
    child.kill("SIGKILL")
  })

/**
 * Starts a fresh Rivet engine (the control plane) in its own process and
 * returns a cluster whose nodes are separate Node.js processes. The engine
 * listens on fixed ports, so suites using it must not run concurrently.
 */
export const makeCluster: Effect.Effect<Cluster, never, Scope.Scope> = Effect.acquireRelease(
  Effect.promise(async () => {
    // The engine refuses to start unless its storage disk keeps a 4 GB
    // reserve free; EFFECT_RIVET_DATA_DIR moves its data off a small tmpfs.
    const base = process.env.EFFECT_RIVET_DATA_DIR ?? os.tmpdir()
    fs.mkdirSync(base, { recursive: true })
    const dir = await fs.promises.mkdtemp(path.join(base, "effect-rivet-integration-"))
    fs.mkdirSync(path.join(dir, "engine", "obj"), { recursive: true })
    fs.mkdirSync(path.join(dir, "engine", "log"), { recursive: true })
    const eventsFile = path.join(dir, "events.ndjson")
    const failWakeFile = path.join(dir, "fail-wake")
    fs.writeFileSync(eventsFile, "")
    const engineLog = fs.openSync(path.join(dir, "engine.log"), "w")
    const engine = spawn(enginePath(), [], {
      cwd: path.join(dir, "engine"),
      stdio: ["ignore", engineLog, engineLog],
      env: {
        ...process.env,
        RIVET__AUTH__ADMIN_TOKEN: token,
        RIVET__OBJECT_STORAGE__PRIMARY__FILE_SYSTEM__PATH: path.join(dir, "engine", "obj"),
        RIVET__STORAGE__LOG_DIRECTORY: path.join(dir, "engine", "log"),
        // Without these two a single-node engine never routes storage.
        RIVET__STORAGE__BALANCING__ENABLED: "false",
        RIVET__STORAGE__AUTO_PROVISION_PARTITIONS: "true",
        // Without explicit caps the engine sizes them from free disk after a
        // reserve of max(10%, 4 GB), and exits on a mostly full disk.
        RIVET__STORAGE__LOG_SHARD__MAX_DISK_BYTES: String(1024 ** 3),
        RIVET__STORAGE__COLD_STORE__DISK_CACHE_BYTES: String(256 * 1024 ** 2),
        ...(nodeLostThreshold === "default" ? undefined : { RIVET__PEGBOARD__NODE_LOST_THRESHOLD: nodeLostThreshold })
      }
    })
    const children: Array<ChildProcess> = [engine]
    const engineLogTail = () => {
      const text = fs.readFileSync(path.join(dir, "engine.log"))
        .toString("latin1")
        .replace(/[^\x20-\x7e\n]+/g, " ")
      return text.split("\n").slice(-30).join("\n")
    }
    await waitFor("The Rivet engine did not become healthy", async () => {
      if (engine.exitCode !== null) {
        throw new Error(`The Rivet engine exited with code ${engine.exitCode}`)
      }
      try {
        const response = await fetch(`${endpoint}/health`)
        return response.ok
      } catch {
        return false
      }
    }, 60_000).catch((error: Error) => {
      engine.kill("SIGKILL")
      throw new Error(`${error.message}\n${engineLogTail()}`)
    })

    const events = (): ReadonlyArray<FixtureEvent> =>
      fs.readFileSync(eventsFile, "utf8").split("\n").filter((line) => line.length > 0).map((line) => JSON.parse(line))
    const nodeLogs = new Map<string, string>()
    const diagnostics = () =>
      [
        `Events:\n${events().map((event) => JSON.stringify(event)).join("\n")}`,
        ...Array.from(
          nodeLogs,
          ([name, file]) => `Log of ${name}:\n${fs.readFileSync(file, "utf8").split("\n").slice(-40).join("\n")}`
        )
      ].join("\n\n")

    const waitForEvent: Cluster["waitForEvent"] = (description, predicate, timeoutMillis = 120_000) =>
      Effect.promise(async () => {
        let found: FixtureEvent | undefined
        await waitFor(description, () => {
          found = events().find(predicate)
          return found !== undefined
        }, timeoutMillis).catch((error: Error) => {
          throw new Error(`${error.message}\n${diagnostics()}`)
        })
        return found!
      })

    const startNode: Cluster["startNode"] = (name, options) =>
      Effect.flatMap(
        Effect.sync(() => {
          const logFile = path.join(dir, `${name}.log`)
          nodeLogs.set(name, logFile)
          const log = fs.openSync(logFile, "w")
          const child = spawn(process.execPath, [path.join(import.meta.dirname, "node.ts")], {
            stdio: ["ignore", log, log],
            env: {
              ...process.env,
              NODE_NAME: name,
              RIVET_ENDPOINT: endpoint,
              RIVET_TOKEN: token,
              EVENTS_FILE: eventsFile,
              FAIL_WAKE_FILE: failWakeFile,
              HOLD: options?.hold === true ? "1" : "0"
            }
          })
          children.push(child)
          const node: Node = {
            name,
            pid: child.pid!,
            signal: (signal) => Effect.sync(() => child.kill(signal)),
            log: () => fs.readFileSync(logFile, "utf8")
          }
          return node
        }),
        (node) =>
          Effect.as(
            waitForEvent(
              `Node ${name} did not start`,
              (event) => event.event === "ready" && event.node === name,
              60_000
            ),
            node
          )
      )

    const client = createClient({ endpoint, token })
    const cluster: Cluster = {
      startNode,
      events,
      waitForEvent,
      failNextWake: Effect.sync(() => fs.writeFileSync(failWakeFile, "")),
      layer: RivetCluster.layer({ entities: [Ledger], client: client as unknown as RivetCluster.ClusterClient })
    }
    return { cluster, children, dir, client }
  }),
  ({ children, client, dir }) =>
    Effect.promise(async () => {
      await client.dispose().catch(() => undefined)
      await Promise.all(children.slice(1).map(stop))
      await stop(children[0])
      if (process.env.EFFECT_RIVET_KEEP_LOGS === "1") {
        console.log(`Rivet integration logs kept in ${dir}`)
      } else {
        await fs.promises.rm(dir, { recursive: true, force: true })
      }
    })
).pipe(Effect.map(({ cluster }) => cluster))

/** Runs `body` against a fresh cluster, with the cluster's `Sharding` provided. */
export const withCluster = <A, E>(
  body: (cluster: Cluster) => Effect.Effect<A, E, Sharding.Sharding>
): Effect.Effect<A, E, Scope.Scope> =>
  Effect.flatMap(makeCluster, (cluster) => Effect.provide(body(cluster), cluster.layer))
