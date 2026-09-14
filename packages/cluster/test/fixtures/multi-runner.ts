import { PostgreSqlContainer } from "@testcontainers/postgresql"
import * as assert from "node:assert/strict"
import { execFileSync, spawn } from "node:child_process"
import { createWriteStream } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as Pg from "pg"

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const bounded = async <A>(promise: Promise<A>, ms: number, label: string): Promise<A> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms)
      })
    ])
  } finally {
    clearTimeout(timer)
  }
}
const until = async (f: () => Promise<boolean>, label: string, ms = 45_000) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await f()) return
    await delay(100)
  }
  throw new Error(`${label} exceeded ${ms}ms`)
}
const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") return reject(new Error("No TCP address"))
      server.close(() => resolve(address.port))
    })
  })

const startWorker = async (name: string, port: number, url: string, dir: string) => {
  const script = process.env.EFFECT_CLUSTER_WORKER_ROOT
    ? path.join(process.env.EFFECT_CLUSTER_WORKER_ROOT, "packages/cluster/test/fixtures/multi-runner-worker.ts")
    : fileURLToPath(new URL("./multi-runner-worker.ts", import.meta.url))
  const log = createWriteStream(path.join(dir, `${name}-${Date.now()}.log`))
  const child = spawn(process.execPath, ["--import", "tsx", script], {
    cwd: process.env.EFFECT_CLUSTER_WORKER_ROOT ?? process.cwd(),
    env: { ...process.env, CLUSTER_TEST_WORKER: name, CLUSTER_TEST_PORT: String(port), CLUSTER_TEST_PG: url },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  })
  child.stdout!.pipe(log, { end: false })
  child.stderr!.pipe(log, { end: false })
  let ready!: () => void
  const readiness = new Promise<void>((resolve) => {
    ready = resolve
  })
  const events: Array<unknown> = []
  let sequence = 0
  const pending = new Map<number, { resolve: (a: any) => void; reject: (e: Error) => void }>()
  child.on("message", (message: any) => {
    if (message.event) {
      events.push({ at: Date.now(), ...message })
      if (message.event === "ready") ready()
      return
    }
    const request = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) request?.reject(new Error(message.error))
    else request?.resolve(message.value)
  })
  const closed = new Promise<number | null>((resolve) => {
    child.once("close", (code) => {
      log.end()
      for (const request of pending.values()) request.reject(new Error(`${name} exited: ${code}`))
      pending.clear()
      resolve(code)
    })
  })
  child.on("error", (error) => log.write(String(error)))
  const stop = async (signal: "SIGTERM" | "SIGKILL" = "SIGTERM") => {
    const start = Date.now()
    if (child.exitCode !== null || child.signalCode !== null) return { ms: 0, forced: false }
    child.kill(signal)
    try {
      const code = await bounded(closed, 15_000, `${name} shutdown`)
      return { ms: Date.now() - start, forced: false, code, signal }
    } catch {
      child.kill("SIGKILL")
      await bounded(closed, 5000, `${name} kill`)
      return { ms: Date.now() - start, forced: true }
    }
  }
  try {
    await bounded(readiness, 30_000, `${name} startup`)
  } catch (error) {
    await stop("SIGKILL")
    throw error
  }
  return {
    name,
    port,
    child,
    events,
    stop,
    call: (command: string, ms = 60_000): Promise<any> => {
      const id = ++sequence
      return bounded(
        new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject })
          child.send({ id, command })
        }),
        ms,
        `${name}:${command}`
      ).finally(() => pending.delete(id))
    }
  }
}

type Worker = Awaited<ReturnType<typeof startWorker>>
export const runMultiRunner = async () => {
  const dir = path.resolve(process.env.EFFECT_CLUSTER_LOGS ?? "multi-runner-results")
  await mkdir(dir, { recursive: true })
  const phases = (process.env.EFFECT_CLUSTER_PHASES ?? "steady,graceful,crash,full-stop").split(",")
  const repeats = Number(process.env.EFFECT_CLUSTER_REPEATS ?? 3)
  assert.ok(Number.isInteger(repeats) && repeats > 0 && repeats <= 10)
  assert.ok(phases.length > 0 && phases.every((p) => ["steady", "graceful", "crash", "full-stop"].includes(p)))
  const workflows = Number(process.env.EFFECT_CLUSTER_WORKFLOWS ?? 6)
  assert.ok(Number.isInteger(workflows) && workflows >= 0 && workflows <= 6)
  const summary: Array<any> = []
  const container = await new PostgreSqlContainer("postgres:16-alpine").withStartupTimeout(60_000).start()
  const admin = new Pg.Pool({ connectionString: container.getConnectionUri() })
  try {
    await writeFile(
      path.join(dir, "environment.json"),
      JSON.stringify(
        {
          revision: execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: process.env.EFFECT_CLUSTER_WORKER_ROOT ?? process.cwd(),
            encoding: "utf8"
          }).trim(),
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          postgres: (await admin.query("SELECT version() AS version")).rows[0].version,
          phases,
          repeats,
          workflows
        },
        null,
        2
      )
    )
    for (let repeat = 1; repeat <= repeats; repeat++) {
      for (const phase of phases) {
        const started = Date.now()
        const database = `integration_${repeat}_${phase.replaceAll("-", "_")}`
        assert.match(database, /^integration_[a-z0-9_]+$/)
        await admin.query(`CREATE DATABASE ${database}`)
        const url = new URL(container.getConnectionUri())
        url.pathname = `/${database}`
        const pool = new Pg.Pool({ connectionString: url.toString() })
        const caseDir = path.join(dir, `${repeat}-${phase}`)
        await mkdir(caseDir, { recursive: true })
        const workers: Array<Worker> = []
        const report: any = {
          repeat,
          phase,
          database,
          topology: [],
          timings: {},
          samples: 0,
          advisoryLocksMax: 0,
          violations: []
        }
        let monitor = true
        let monitoring: Promise<void> = Promise.resolve()
        try {
          await pool.query(`CREATE TABLE integration_gate (released boolean NOT NULL);
            INSERT INTO integration_gate VALUES (false);
            CREATE TABLE integration_attempts (id bigserial PRIMARY KEY, worker text NOT NULL, kind text NOT NULL,
              key text NOT NULL, started timestamptz NOT NULL DEFAULT clock_timestamp(), ended timestamptz)`)
          const ports = await Promise.all([freePort(), freePort(), freePort()])
          for (let i = 0; i < 3; i++) workers.push(await startWorker(`runner-${i}`, ports[i], url.toString(), caseDir))
          const client = await startWorker("client", 0, url.toString(), caseDir)
          workers.push(client)
          report.topology = workers.map((w) => ({ name: w.name, pid: w.child.pid, port: w.port }))
          const active = () =>
            workers.filter((w) => w.name !== "client" && w.child.exitCode === null && w.child.signalCode === null)
          const partition = async () => {
            const shards: Array<Array<number>> = await Promise.all(active().map((w) => w.call("snapshot", 5000)))
            report.lastPartition = shards
            return shards.every((s) => s.length > 0) && shards.flat().length === 12 &&
              new Set(shards.flat()).size === 12
          }
          await until(partition, "initial shard partition")
          report.timings.startupMs = Date.now() - started
          monitoring = (async () => {
            while (monitor) {
              const locks = await pool.query(`SELECT classid, objid, objsubid, count(DISTINCT pid)::int AS owners
                FROM pg_locks WHERE locktype = 'advisory' AND granted AND mode = 'ExclusiveLock'
                  AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
                GROUP BY classid, objid, objsubid`)
              const overlap = await pool.query(
                `SELECT kind, key, array_agg(DISTINCT worker) AS owners
                FROM integration_attempts WHERE ended IS NULL AND worker = ANY($1::text[])
                GROUP BY kind, key HAVING count(DISTINCT worker) > 1`,
                [active().map((w) => w.name)]
              )
              report.samples++
              report.advisoryLocksMax = Math.max(report.advisoryLocksMax, locks.rows.length)
              for (const row of locks.rows) if (row.owners > 1) report.violations.push(row)
              for (const row of overlap.rows) report.violations.push(row)
              await delay(100)
            }
          })().catch((error) => {
            report.monitorError = String(error)
          })
          report.workload = await client.call("submit")
          await until(async () => {
            const { rows } = await pool.query(`SELECT kind, count(DISTINCT key)::int AS count
              FROM integration_attempts GROUP BY kind`)
            const counts = Object.fromEntries(rows.map((r) => [r.kind, r.count]))
            report.started = counts
            return counts.request === 24 && counts.stream === 6 && (counts.race ?? 0) === report.workload.workflows &&
              (counts.child ?? 0) === report.workload.workflows * report.workload.children
          }, "all workload handlers started")
          await delay(250)
          assert.ok(
            (await client.call("poll")).every((r: any) => r === null || r._tag !== "Complete"),
            "premature workflow completion"
          )
          const before = await pool.query("SELECT count(*)::int AS count FROM cluster_messages WHERE kind = 0")
          report.pendingRequestsBefore = before.rows[0].count
          report.streamEventsBeforeFault = client.events.slice()
          const owners = await pool.query(`SELECT worker, count(*)::int AS count,
            count(*) FILTER (WHERE kind = 'stream' AND key IN ('stream-3','stream-4','stream-5'))::int AS held_streams
            FROM integration_attempts WHERE ended IS NULL AND kind IN ('request','stream','race')
            GROUP BY worker ORDER BY held_streams DESC, count DESC`)
          const victim = workers.find((w) => w.name === owners.rows[0].worker)!
          report.victim = victim.name
          report.ownersBeforeFault = owners.rows
          assert.ok(owners.rows[0].held_streams > 0, "victim must own an in-flight stream")
          const faultStart = Date.now()
          if (phase === "graceful" || phase === "crash") {
            report.shutdown = await victim.stop(phase === "crash" ? "SIGKILL" : "SIGTERM")
            await until(partition, "two-runner shard reassignment")
            report.timings.reassignmentMs = Date.now() - faultStart
            workers.push(await startWorker(`${victim.name}-restart`, victim.port, url.toString(), caseDir))
            await until(partition, "restarted runner shard partition")
          } else if (phase === "full-stop") {
            report.shutdown = await Promise.all(active().map((w) => w.stop()))
            assert.equal(active().length, 0)
            const pending = await pool.query(
              "SELECT count(*)::int AS count FROM cluster_messages WHERE processed = false"
            )
            report.pendingAtFullStop = pending.rows[0].count
            assert.ok(report.pendingAtFullStop > 0, "full stop must retain pending durable work")
            await delay(500)
            for (let i = 0; i < 3; i++) {
              workers.push(await startWorker(`runner-${i}-restart`, ports[i], url.toString(), caseDir))
            }
            await until(partition, "full cluster restart")
          }
          assert.ok(
            (await client.call("poll")).every((r: any) => r === null || r._tag !== "Complete"),
            "ownership change persisted a false result"
          )
          report.raceRelease = await client.call("release")
          await pool.query("UPDATE integration_gate SET released = true")
          report.results = await client.call("results", 70_000)
          report.timings.recoveryAndCompletionMs = Date.now() - faultStart
          const successes = (exits: Array<any>) =>
            exits.map((exit) => {
              assert.equal(exit._tag, "Success", JSON.stringify(exit))
              return exit.value
            })
          report.attempts =
            (await pool.query("SELECT worker, kind, count(*)::int FROM integration_attempts GROUP BY worker, kind"))
              .rows
          report.persisted = (await pool.query(`SELECT entity_type, tag, processed, count(*)::int FROM cluster_messages
            WHERE kind = 0 GROUP BY entity_type, tag, processed ORDER BY entity_type, tag`)).rows
          const shutdowns = report.shutdown
            ? (Array.isArray(report.shutdown) ? report.shutdown : [report.shutdown])
            : []
          const checks: Record<string, () => void> = {
            requests: () => {
              assert.equal(report.results.requests._tag, "Success", JSON.stringify(report.results.requests))
              assert.deepEqual(successes(report.results.requests.value), Array.from({ length: 24 }, (_, i) => i * 2))
            },
            fanout: () =>
              assert.deepEqual(
                successes(report.results.parents),
                Array.from({ length: report.workload.workflows }, () => [0, 1, 2])
              ),
            races: () => {
              assert.deepEqual(successes(report.raceRelease), Array(report.workload.workflows).fill("signal"))
              assert.deepEqual(successes(report.results.races), Array(report.workload.workflows).fill("signal"))
            },
            partialStreams: () => {
              assert.equal(report.results.streams._tag, "Success", JSON.stringify(report.results.streams))
              assert.deepEqual(
                successes(report.results.streams.value.slice(0, 3)),
                Array.from({ length: 3 }, () => Array.from({ length: 8 }, (_, i) => i))
              )
            },
            heldStreams: () => {
              assert.equal(report.results.streams._tag, "Success", JSON.stringify(report.results.streams))
              assert.deepEqual(
                successes(report.results.streams.value.slice(3)),
                Array.from({ length: 3 }, () => Array.from({ length: 8 }, (_, i) => i))
              )
            },
            ownership: () => {
              assert.equal(report.monitorError, undefined)
              assert.ok(report.advisoryLocksMax >= 12, "must observe real PostgreSQL advisory shard locks")
              assert.deepEqual(report.violations, [], "overlapping ownership/handler execution observed")
            },
            shutdown: () =>
              assert.ok(
                shutdowns.every((s: any) => !s.forced && (s.signal === "SIGKILL" || s.code === 0)),
                "graceful shutdown failed or exceeded its deadline"
              )
          }
          report.checks = {}
          for (const [name, check] of Object.entries(checks)) {
            try {
              check()
              report.checks[name] = true
            } catch (error) {
              report.checks[name] = String(error)
            }
          }
          assert.ok(
            Object.values(report.checks).every((v) => v === true),
            `Failed checks: ${Object.keys(report.checks).filter((k) => report.checks[k] !== true).join(", ")}`
          )
          report.ok = true
        } catch (error) {
          report.ok = false
          report.error = String(error)
          report.stack = error instanceof Error ? error.stack : undefined
          report.attempts =
            (await pool.query("SELECT * FROM integration_attempts ORDER BY id").catch(() => ({ rows: [] }))).rows
          report.messages =
            (await pool.query("SELECT * FROM cluster_messages ORDER BY rowid").catch(() => ({ rows: [] }))).rows
          report.replies =
            (await pool.query("SELECT * FROM cluster_replies ORDER BY rowid").catch(() => ({ rows: [] }))).rows
        } finally {
          monitor = false
          await monitoring
          report.finalShutdown = await Promise.all(workers.map((w) => w.stop()))
          if (report.finalShutdown.some((s: { forced: boolean }) => s.forced)) {
            report.ok = false
            report.error = `${report.error ?? ""} final shutdown exceeded its deadline`
          }
          report.events = workers.flatMap((w) => w.events)
          report.timings.totalMs = Date.now() - started
          await writeFile(path.join(caseDir, "report.json"), JSON.stringify(report, null, 2))
          await pool.end()
          summary.push(report)
          await writeFile(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2))
          process.stdout.write(
            `${
              JSON.stringify({
                repeat,
                phase,
                ok: report.ok,
                error: report.error?.split("\n")[0],
                timings: report.timings
              })
            }\n`
          )
        }
      }
    }
  } finally {
    await admin.end()
    await container.stop()
  }
  assert.ok(
    summary.every((r) => r.ok),
    `Integration failures: ${summary.filter((r) => !r.ok).map((r) => `${r.repeat}/${r.phase}: ${r.error}`).join("; ")}`
  )
}
