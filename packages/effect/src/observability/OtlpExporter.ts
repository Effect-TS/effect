/**
 * Shared batch exporter for OTLP/HTTP observability modules.
 *
 * Signal modules use this exporter to buffer already-encoded telemetry and post
 * it to a configured OTLP endpoint. It owns the scoped transport loop, batching,
 * retry behavior, temporary disabling after repeated failures, and final flush
 * during shutdown.
 *
 * @stability unstable
 * @since 4.0.0
 */
import { Clock } from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Fiber from "../Fiber.ts"
import { identity } from "../Function.ts"
import * as Headers from "../http/Headers.ts"
import type { HttpBody } from "../http/HttpBody.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import * as Latch from "../Latch.ts"
import * as Layer from "../Layer.ts"
import * as Result from "../Result.ts"
import * as Schedule from "../Schedule.ts"
import * as Scope from "../Scope.ts"
import * as Version from "../Version.ts"

// A missing or invalid Retry-After falls back to a fixed delay.
const retryAfterDelay = (value: string | undefined): Effect.Effect<Duration.Duration> => {
  const retryAfter = value === undefined ? undefined : Headers.parseRetryAfter(value)
  if (retryAfter === undefined || Result.isFailure(retryAfter)) {
    return Effect.succeed(Duration.seconds(5))
  }
  return Effect.map(
    Clock,
    (clock) => Headers.retryAfterDelay(retryAfter.success, clock.currentTimeMillisUnsafe())
  )
}

const policy = Schedule.forever.pipe(
  Schedule.passthrough,
  Schedule.addDelay(({ output: error }) => {
    if (
      HttpClientError.isHttpClientError(error)
      && error.reason._tag === "StatusCodeError"
      && error.reason.response.status === 429
    ) {
      return retryAfterDelay(error.reason.response.headers["retry-after"])
    }
    return Effect.succeed(Duration.seconds(1))
  })
)

/**
 * Registry of exporter flush operations, used to manually drain buffered
 * telemetry before the surrounding scope closes.
 *
 * **Details**
 *
 * Every exporter created by `make` registers its flush operation here, so a
 * single `flush` drains all signals sharing the registry concurrently while
 * each exporter serializes its own requests. For each exporter, `flush` returns
 * once any export already in flight when it was called has settled and every
 * item accepted before the call has been sent or discarded by a failed export
 * (or after one fresh snapshot settles when `exportEmpty` is enabled). `flush`
 * cannot fail and respects each exporter's temporary-disable window. Wrap it
 * with `Effect.timeoutOption` to bound its duration at the call site.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Flusher extends Context.Service<Flusher, {
  /**
   * Drains all registered exporters concurrently and cannot fail.
   *
   * **Details**
   *
   * Each exporter runs its exports sequentially. `flush` waits for any export
   * already in flight when called to settle and drains items accepted before
   * the call (items pushed while a flush is running may be included in a batch,
   * but `flush` does not wait for them). Interrupting `flush` only stops the
   * wait without cancelling in-flight exports or dropping queued items.
   *
   * There is no built-in timeout; use `Effect.timeoutOption` to bound the
   * operation. Exporters in their 60-second `disabledUntil` window are skipped.
   *
   * **Example** (Flushing exporters)
   *
   * ```ts import.meta.vitest
   * import { Effect } from "effect"
   * import { OtlpExporter } from "effect/observability"
   *
   * const program = Effect.gen(function*() {
   *   const flusher = yield* OtlpExporter.Flusher
   *   yield* flusher.flush
   *   return "flushed"
   * }).pipe(Effect.provide(OtlpExporter.layerFlusher))
   *
   * await Effect.runPromise(program) // => "flushed"
   * ```
   */
  readonly flush: Effect.Effect<void>
  readonly register: (run: Effect.Effect<void>) => Effect.Effect<void, never, Scope.Scope>
}>()(
  "effect/observability/OtlpExporter/Flusher"
) {}

/**
 * Provides a `Flusher` backed by a fresh registry.
 *
 * **Details**
 *
 * This is intentionally a single module-level constant rather than a factory:
 * layer memoization is keyed by layer instance, so every signal layer
 * referencing this same constant shares one registry per layer build, and one
 * `flush` drains traces, logs and metrics together. A factory returning a new
 * layer per call would silently create one registry per signal.
 *
 * Registration is scoped — an exporter is removed from the registry when its
 * own scope closes. Flushing with an empty registry is a no-op.
 *
 * For each registered exporter, `flush` awaits any export already in flight
 * when it was called and drains every item accepted before the call (or sends
 * one fresh snapshot when `exportEmpty` is enabled). Interrupting `flush` only
 * stops waiting and does not cancel the shared in-flight export or drop queued
 * items.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerFlusher: Layer.Layer<Flusher> = Layer.sync(Flusher, () => {
  const registry = new Set<Effect.Effect<void>>()
  return {
    flush: Effect.suspend(() => {
      if (registry.size === 0) {
        return Effect.void
      }
      return Effect.forEach(registry, identity, {
        concurrency: "unbounded",
        discard: true
      })
    }),
    register: (run) =>
      Effect.flatMap(Scope.Scope, (scope) => {
        registry.add(run)
        return Scope.addFinalizer(
          scope,
          Effect.sync(() => registry.delete(run))
        )
      })
  }
})

const normalizePositiveInt = (value: number, fallback: number): number => {
  if (Number.isNaN(value)) return fallback
  if (value === Number.POSITIVE_INFINITY) return value
  return Math.max(1, Math.floor(value))
}

const normalizeNonNegativeInt = (value: number, fallback: number): number => {
  if (Number.isNaN(value)) return fallback
  if (value === Number.POSITIVE_INFINITY) return value
  return Math.max(0, Math.floor(value))
}

/**
 * Creates a scoped OTLP batch exporter.
 *
 * **Details**
 *
 * The exporter buffers pushed data up to `maxQueueSize` (dropping new arrivals
 * on overflow and notifying `onDrop`), sends FIFO batches of at most
 * `maxBatchSize` with at most one export (including retries) in flight at a
 * time, temporarily disables exporting after unhandled failures, and drains
 * remaining items during scope finalization up to `shutdownTimeout`.
 *
 * The export interval starts with the first push and stops once an export
 * empties the buffer, so an idle exporter keeps no timer pending. With
 * `exportEmpty` and batching disabled, it exports on every interval instead.
 *
 * Optional gzip compression uses `HttpClientRequest.compressBody` before the
 * retry loop, so retries reuse the compressed bytes. Bodies smaller than 1KB
 * remain uncompressed. Compression requires runtime `CompressionStream` support;
 * compression failures follow the same temporary-disable behavior as transport
 * failures and do not fail flushing or shutdown.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make: (
  options: {
    readonly url: string
    readonly headers: Headers.Input | undefined
    /** Gzip uses the default 1KB minimum body size; smaller batches remain uncompressed. */
    readonly compression?: "gzip" | "none" | undefined
    readonly label: string
    readonly exportInterval: Duration.Input
    readonly maxBatchSize: number | "disabled"
    /**
     * Maximum number of items buffered in the pending queue. New items pushed
     * while the queue is full are dropped and reported to `onDrop`.
     *
     * Defaults to `2048` (or `maxBatchSize` if larger).
     */
    readonly maxQueueSize?: number | undefined
    /**
     * Synchronous callback invoked when items are dropped due to queue overflow.
     */
    readonly onDrop?: ((count: number) => void) | undefined
    readonly exportEmpty?: boolean | undefined
    readonly body: (data: Array<any>) => readonly [body: HttpBody, onSuccess: Effect.Effect<void>]
    readonly shutdownTimeout: Duration.Input
  }
) => Effect.Effect<
  { readonly push: (data: unknown) => void },
  never,
  Flusher | HttpClient.HttpClient | Scope.Scope
> = Effect.fnUntraced(function*(options) {
  const services = yield* Effect.context<Scope.Scope | HttpClient.HttpClient>()
  const clock = Context.get(services, Clock)
  const scope = Context.get(services, Scope.Scope)
  const exportInterval = Duration.max(Duration.fromInputUnsafe(options.exportInterval), Duration.zero)
  const maxBatchSize = options.maxBatchSize === "disabled"
    ? "disabled"
    : normalizePositiveInt(options.maxBatchSize, 1)
  const defaultMaxQueueSize = maxBatchSize === "disabled" || !Number.isFinite(maxBatchSize)
    ? 2048
    : Math.max(2048, maxBatchSize)
  const maxQueueSize = options.maxQueueSize !== undefined
    ? normalizeNonNegativeInt(options.maxQueueSize, defaultMaxQueueSize)
    : defaultMaxQueueSize

  const client = Context.get(services, HttpClient.HttpClient).pipe(
    HttpClient.tap((response) => Effect.ignore(response.arrayBuffer)),
    HttpClient.tapError((error) => error.response ? Effect.ignore(error.response.arrayBuffer) : Effect.void),
    HttpClient.filterStatusOk,
    HttpClient.transformResponse(Effect.provideService(HttpClient.TracerPropagationEnabled, false)),
    HttpClient.retryTransient({ schedule: policy, times: 3 })
  )

  const exporterUserAgent = `OTel-OTLP-Exporter-JavaScript-Effect-${options.label}/${Version.getCurrentVersion()}`
  const userHeaders = Headers.fromInput(options.headers)
  const userAgent = userHeaders["user-agent"]
  const headers = Headers.set(
    userHeaders,
    "user-agent",
    userAgent ? `${userAgent} ${exporterUserAgent}` : exporterUserAgent
  )

  const request = HttpClientRequest.post(options.url, { headers })
  const exportsEmpty = maxBatchSize === "disabled" && options.exportEmpty === true

  let queue: Array<any> = []
  let queueHead = 0
  const queueLength = () => queue.length - queueHead
  const clearQueue = () => {
    queue = []
    queueHead = 0
  }
  const takeBatch = (): Array<any> => {
    const len = queue.length - queueHead
    if (len === 0) return []
    const count = maxBatchSize === "disabled" ? len : Math.min(len, maxBatchSize)
    if (count === len) {
      const items = queueHead === 0 ? queue : queue.slice(queueHead)
      queue = []
      queueHead = 0
      return items
    }
    const items = new Array<any>(count)
    for (let i = 0; i < count; i++) {
      items[i] = queue[queueHead + i]
      queue[queueHead + i] = undefined
    }
    queueHead += count
    if (queueHead * 2 >= queue.length) {
      queue = queue.slice(queueHead)
      queueHead = 0
    }
    return items
  }

  let disabledUntil: number | undefined = undefined
  let closed = false
  let enqueuedSeq = 0
  let dequeuedSeq = 0
  let settledSeq = 0
  let drainTargetSeq = 0
  let snapshotStartedSeq = 0
  let snapshotSettledSeq = 0
  let drainSnapshotTarget = 0
  let workerRunning = false

  interface Waiter {
    readonly isReady: () => boolean
    readonly deferred: Deferred.Deferred<void>
  }
  const waiters = new Set<Waiter>()

  const isDisabled = () => {
    if (disabledUntil === undefined) return false
    if (clock.currentTimeMillisUnsafe() < disabledUntil) return true
    disabledUntil = undefined
    return false
  }

  const notifyWaiters = () => {
    if (waiters.size === 0) return
    for (const waiter of waiters) {
      if (waiter.isReady()) {
        waiters.delete(waiter)
        Deferred.doneUnsafe(waiter.deferred, Effect.void)
      }
    }
  }

  const waitFor = (isReady: () => boolean): Effect.Effect<void> =>
    Effect.suspend(() => {
      if (isReady()) return Effect.void
      const deferred = Deferred.makeUnsafe<void>()
      const waiter: Waiter = { isReady, deferred }
      waiters.add(waiter)
      return Deferred.await(deferred).pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            waiters.delete(waiter)
          })
        )
      )
    })

  // `armed` is open while there is something to export. It changes in the
  // same synchronous step as the queue check, so a push is never stranded.
  const armed = yield* Latch.make(exportsEmpty)
  const wake = yield* Latch.make()
  const syncTimerState = () => {
    if (exportsEmpty) return
    if (queueLength() > 0 && !closed && !isDisabled()) {
      armed.openUnsafe()
    } else if (armed.closeUnsafe()) {
      wake.openUnsafe()
    }
  }

  const executeExport = (items: Array<any>, onSettled: () => void): Effect.Effect<void> =>
    Effect.suspend(() => {
      const [body, onSuccess] = options.body(items)
      const batchRequest = HttpClientRequest.setBody(request, body)
      // Compress before client.execute so transient retries reuse the encoded bytes.
      const response = options.compression === "gzip"
        ? HttpClientRequest.compressBody(batchRequest, "gzip").pipe(Effect.flatMap(client.execute))
        : client.execute(batchRequest)
      return response.pipe(
        Effect.andThen(onSuccess),
        Effect.andThen(
          Effect.sync(() => {
            onSettled()
            notifyWaiters()
          })
        ),
        Effect.withTracerEnabled(false)
      )
    }).pipe(
      Effect.catchCause((cause) => {
        if (disabledUntil === undefined) {
          disabledUntil = clock.currentTimeMillisUnsafe() + 60_000
        }
        clearQueue()
        dequeuedSeq = enqueuedSeq
        settledSeq = Math.max(settledSeq, enqueuedSeq)
        snapshotSettledSeq = Math.max(snapshotSettledSeq, snapshotStartedSeq)
        drainTargetSeq = Math.max(drainTargetSeq, enqueuedSeq)
        drainSnapshotTarget = Math.max(drainSnapshotTarget, snapshotStartedSeq)
        return Effect.logWarning("Disabling exporter for 60 seconds", cause).pipe(
          Effect.andThen(Effect.sync(notifyWaiters))
        )
      }),
      Effect.annotateLogs({
        package: "@effect/opentelemetry",
        module: options.label
      })
    )

  const hasImmediateWork = (): boolean => {
    if (closed || isDisabled()) return false
    if (exportsEmpty) {
      return drainSnapshotTarget > snapshotStartedSeq
    }
    const len = queueLength()
    if (len === 0) return false
    return (maxBatchSize !== "disabled" && len >= maxBatchSize)
      || drainTargetSeq > dequeuedSeq
  }

  const workerLoop: Effect.Effect<void> = Effect.suspend(() => {
    if (!hasImmediateWork()) {
      workerRunning = false
      syncTimerState()
      notifyWaiters()
      return Effect.void
    }

    if (exportsEmpty) {
      const seq = ++snapshotStartedSeq
      const items = takeBatch()
      const batchEndSeq = dequeuedSeq + items.length
      dequeuedSeq = batchEndSeq
      return executeExport(items, () => {
        snapshotSettledSeq = Math.max(snapshotSettledSeq, seq)
        settledSeq = Math.max(settledSeq, batchEndSeq)
      }).pipe(Effect.flatMap(() => workerLoop))
    }

    const items = takeBatch()
    const batchEndSeq = dequeuedSeq + items.length
    dequeuedSeq = batchEndSeq
    return executeExport(items, () => {
      settledSeq = Math.max(settledSeq, batchEndSeq)
    }).pipe(Effect.flatMap(() => workerLoop))
  })

  const runFork = Effect.runForkWith(services)
  let workerFiber: Fiber.Fiber<void, never> | undefined = undefined
  let timerFiber: Fiber.Fiber<void, never> | undefined = undefined

  const ensureWorker = () => {
    if (workerRunning || !hasImmediateWork()) return
    workerRunning = true
    const fiber = runFork(workerLoop)
    workerFiber = fiber
    fiber.addObserver(() => {
      if (workerFiber === fiber) {
        workerFiber = undefined
        if (workerRunning) {
          workerRunning = false
          syncTimerState()
          notifyWaiters()
        }
      }
    })
  }

  const drain: Effect.Effect<void> = Effect.suspend(() => {
    if (closed || isDisabled()) return Effect.void
    if (exportsEmpty) {
      const target = snapshotStartedSeq + 1
      if (target > drainSnapshotTarget) {
        drainSnapshotTarget = target
      }
      ensureWorker()
      return waitFor(() => snapshotSettledSeq >= target || closed || isDisabled())
    }
    const target = enqueuedSeq
    if (settledSeq >= target) {
      return Effect.void
    }
    if (target > drainTargetSeq) {
      drainTargetSeq = target
    }
    ensureWorker()
    return waitFor(() => settledSeq >= target || closed || isDisabled())
  })

  // Single finalizer orders timer stop -> drain -> worker interrupt regardless
  // of whether `scope` uses sequential or parallel finalization, and bounds
  // shutdown by `shutdownTimeout` even if the HTTP client is uninterruptible.
  yield* Scope.addFinalizer(
    scope,
    Effect.suspend(() => {
      const stopTimer = timerFiber !== undefined ? Fiber.interrupt(timerFiber) : Effect.void
      return stopTimer.pipe(
        Effect.andThen(drain),
        Effect.ignore,
        Effect.interruptible,
        Effect.timeoutOption(options.shutdownTimeout),
        Effect.andThen(
          Effect.suspend(() => {
            closed = true
            clearQueue()
            notifyWaiters()
            timerFiber?.interruptUnsafe()
            if (workerFiber === undefined) return Effect.void
            workerFiber.interruptUnsafe()
            return Effect.yieldNow
          })
        )
      )
    })
  )

  if (!closed && Duration.isFinite(exportInterval)) {
    timerFiber = runFork(
      Effect.gen(function*() {
        while (true) {
          wake.closeUnsafe()
          yield* armed.await
          const expired = yield* Effect.race(
            Effect.as(Effect.sleep(exportInterval), true),
            Effect.as(wake.await, false)
          )
          if (!expired) continue
          if (closed || isDisabled()) {
            syncTimerState()
            continue
          }
          if (exportsEmpty) {
            if (!workerRunning) {
              const target = snapshotStartedSeq + 1
              if (target > drainSnapshotTarget) {
                drainSnapshotTarget = target
              }
              ensureWorker()
            }
            yield* waitFor(() => !workerRunning || closed || isDisabled())
          } else {
            if (queueLength() > 0 && enqueuedSeq > drainTargetSeq) {
              drainTargetSeq = enqueuedSeq
              ensureWorker()
            }
            if (workerRunning) {
              yield* waitFor(() => !workerRunning || closed || isDisabled())
            }
            syncTimerState()
          }
        }
      })
    )
  }

  const flusher = yield* Flusher
  yield* flusher.register(drain)

  return {
    push(data) {
      // With no idle timer, the next push ends the disabled window.
      if (closed || isDisabled()) return
      if (queueLength() >= maxQueueSize) {
        options.onDrop?.(1)
        return
      }
      queue.push(data)
      enqueuedSeq++
      if (maxBatchSize !== "disabled" && queueLength() >= maxBatchSize) {
        ensureWorker()
      } else {
        armed.openUnsafe()
      }
    }
  }
})
