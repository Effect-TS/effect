import { PgClient, type PgConnection } from "@effect/sql-pg"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Data, Effect, Layer, Redacted, String } from "effect"
import { getContainerRuntimeClient } from "testcontainers"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class PgContainer extends Context.Service<PgContainer>()("test/PgContainer", {
  make: Effect.acquireRelease(
    Effect.tryPromise({
      try: () => new PostgreSqlContainer("postgres:alpine").start(),
      catch: (cause) => new ContainerError({ cause })
    }),
    (container) =>
      Effect.promise(async () => {
        await container.stop({ remove: false })
        const client = await getContainerRuntimeClient()
        const handle = client.container.getById(container.getId())
        // Stop can return before the daemon processes the exit event; wait before removing.
        await handle.wait({ condition: "not-running" })
        await client.container.remove(handle, { removeVolumes: true })
      })
  )
}) {
  static readonly layer = Layer.effect(this)(this.make)

  static layerClient = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri())
      })
    })
  ).pipe(Layer.provide(this.layer))

  static layerMakeClient = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layerFrom(PgClient.makeClient({
        url: Redacted.make(container.getConnectionUri())
      }))
    })
  ).pipe(Layer.provide(this.layer))

  static layerMakeClientUnprepared = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layerFrom(PgClient.makeClient({
        url: Redacted.make(container.getConnectionUri()),
        prepare: false
      }))
    })
  ).pipe(Layer.provide(this.layer))

  static layerMakeClientAcquireForStream = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layerFrom(PgClient.makeClient({
        url: Redacted.make(container.getConnectionUri()),
        applicationName: "side-default",
        acquireForStream: true
      }))
    })
  ).pipe(Layer.provide(this.layer))

  static layerClientWithTransforms = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri()),
        transformResultNames: String.snakeToCamel,
        transformQueryNames: String.camelToSnake
      })
    })
  ).pipe(Layer.provide(this.layer))

  static layerClientForListen = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri()),
        maxConnections: 2,
        multiplex: true
      })
    })
  ).pipe(Layer.provide(this.layer))
}

// `it.effect` runs under the TestClock, so poll loops sleep in real time.
export const realSleep = Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 10)))
const activeTimeoutMs = 10_000

export const waitUntilActive = (observer: PgConnection.PgConnection, pid: number, advisoryLock = false) =>
  Effect.gen(function*() {
    const startedAt = Date.now()
    while (Date.now() - startedAt < activeTimeoutMs) {
      const active = yield* observer.query(
        `SELECT count(*)::int4 AS active FROM pg_stat_activity
         WHERE pid = $1 AND state = 'active'
           AND (NOT $2::boolean OR (wait_event_type = 'Lock' AND wait_event = 'advisory'))`,
        [pid, advisoryLock]
      )
      if (active.rows[0].active === 1) return
      yield* realSleep
    }
    return yield* Effect.fail(
      new Error(
        `PostgreSQL backend ${pid} did not become ${
          advisoryLock ? "blocked on an advisory lock" : "active"
        } within 10 seconds`
      )
    )
  })

// Parse can report active before Execute starts. Cancellation needs the query to be waiting on the lock.
export const waitUntilAdvisoryLock = (observer: PgConnection.PgConnection, pid: number) =>
  waitUntilActive(observer, pid, true)
