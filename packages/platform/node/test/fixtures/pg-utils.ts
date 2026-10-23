import { PgClient } from "@effect/sql-pg"
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Clock, Context, Data, Effect, Fiber, Layer, Redacted, String } from "effect"
import { constVoid } from "effect/Function"
import { SqlClient } from "effect/sql"
import { getContainerRuntimeClient } from "testcontainers"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

// it.effect and it.layer provide a TestClock that only moves when a test
// adjusts it, so container deadlines must read the real clock.
const withLiveClock = Effect.provideService(Clock.Clock, Clock.Clock.defaultValue())

// testcontainers waits up to 120 seconds for a healthy container. Give up
// sooner so a stuck start fails with a ContainerError inside the hook budget.
const startupTimeout = "90 seconds"

const stopAndRemove = Effect.fnUntraced(
  function*(container: StartedPostgreSqlContainer) {
    yield* Effect.promise(() => container.stop({ remove: false }))
    const client = yield* Effect.promise(() => getContainerRuntimeClient())
    const handle = client.container.getById(container.getId())
    // Stop can return before the daemon processes the exit event; wait before removing.
    // docker-modem can leave an aborted response pending forever. Abort each
    // timed-out request and retry only this read-only wait, not stop or remove.
    yield* Effect.tryPromise((signal) => handle.wait({ condition: "not-running", abortSignal: signal })).pipe(
      Effect.timeout("2 seconds"),
      Effect.retry({ times: 2 })
    )
    yield* Effect.promise(() => client.container.remove(handle, { removeVolumes: true }))
  },
  // Cleanup failures remain visible defects rather than being suppressed.
  Effect.orDie,
  withLiveClock
)

// Wait up to eight seconds, leaving headroom under Vitest's ten-second
// cancellation-hook deadline. A slower release finishes in the background
// instead of failing whichever test closes the layer.
const releaseContainer = (container: StartedPostgreSqlContainer) =>
  Effect.flatMap(Effect.forkDetach(stopAndRemove(container)), (fiber) =>
    Fiber.join(fiber).pipe(
      Effect.timeoutOrElse({
        duration: "8 seconds",
        orElse: () =>
          Effect.logWarning(
            `PostgreSQL container ${container.getId()} is still being released, continuing in the background`
          )
      }),
      withLiveClock
    ))

interface Starting {
  readonly promise: Promise<StartedPostgreSqlContainer>
  started: StartedPostgreSqlContainer | undefined
}

// The start runs outside the acquisition, so waiting for it stays
// interruptible. The release owns the container either way: one that finishes
// starting after its waiter gave up is released in the background, so
// teardown never waits for a slow start.
const startContainer = Effect.acquireRelease(
  Effect.sync((): Starting => {
    const starting: Starting = { promise: new PostgreSqlContainer("postgres:alpine").start(), started: undefined }
    starting.promise.then((container) => {
      starting.started = container
    }, constVoid)
    return starting
  }),
  (starting) =>
    starting.started !== undefined
      ? releaseContainer(starting.started)
      : Effect.sync(() => {
        starting.promise.then((container) => Effect.runFork(stopAndRemove(container)), constVoid)
      })
)

let databases = 0

const runAdmin = (container: StartedPostgreSqlContainer, statement: string) =>
  SqlClient.SqlClient.use((sql) => sql.unsafe(statement)).pipe(
    Effect.provide(PgClient.layer({ url: Redacted.make(container.getConnectionUri()) })),
    Effect.timeout("10 seconds"),
    Effect.orDie,
    withLiveClock
  )

export class PgContainer extends Context.Service<PgContainer>()("test/PgContainer", {
  make: Effect.flatMap(startContainer, (starting) =>
    Effect.tryPromise({
      try: () => starting.promise,
      catch: (cause) => new ContainerError({ cause })
    }).pipe(
      Effect.timeoutOrElse({
        duration: startupTimeout,
        orElse: () =>
          Effect.fail(
            new ContainerError({ cause: new Error(`PostgreSQL container did not start within ${startupTimeout}`) })
          )
      }),
      withLiveClock
    ))
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

  /**
   * A client for a database of its own on a shared container. Tests that each
   * need an empty database share one container this way, so container startup
   * stays out of their time budget. The database is dropped after the client
   * closes.
   */
  static layerClientDatabase = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      const database = `test_${++databases}`
      yield* Effect.acquireRelease(
        runAdmin(container, `CREATE DATABASE ${database}`),
        () => runAdmin(container, `DROP DATABASE ${database} WITH (FORCE)`)
      )
      return PgClient.layer({
        host: container.getHost(),
        port: container.getPort(),
        database,
        username: container.getUsername(),
        password: Redacted.make(container.getPassword())
      })
    })
  )

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
}
