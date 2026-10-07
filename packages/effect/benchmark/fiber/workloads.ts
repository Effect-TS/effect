/**
 * Fiber runtime workload registry.
 *
 * Every workload is a factory over the effect module namespace so the same
 * file can measure any checkout (`worker.mts --root <dir>`). Only type imports
 * of effect are allowed here; they are erased before execution.
 */
import type * as EffectIndex from "effect"
import type * as Deferred from "effect/Deferred"
import type { Effect } from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import type * as Queue from "effect/Queue"
import type * as Semaphore from "effect/Semaphore"

export type EffectModule = typeof EffectIndex

export interface WorkloadInstance {
  /** Executes one measured iteration. */
  readonly run: () => Promise<void> | void
  /** Asserts the result of the latest iteration and resets it. */
  readonly validate: () => void
  /** Optional extra metrics aggregated over every iteration since `make`. */
  readonly metrics?: () => Record<string, number>
}

export interface Workload {
  readonly name: string
  readonly group: "sync" | "fiber" | "async" | "interruption" | "queue" | "mixed"
  readonly description: string
  /** Default sizes; `make` receives these merged with `--size k=v` overrides. */
  readonly size: Readonly<Record<string, number>>
  readonly make: (E: EffectModule, size: Readonly<Record<string, number>>) => WorkloadInstance
}

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`validation failed: ${message}`)
}

const expectEqual = (name: string, actual: unknown, expected: unknown): void =>
  assert(actual === expected, `${name}: expected ${String(expected)}, got ${String(actual)}`)

const triangular = (n: number) => n * (n - 1) / 2

const medianOf = (values: ReadonlyArray<number>): number => {
  if (values.length === 0) return NaN
  const sorted = values.slice().sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

/**
 * Shared shape: a pre-built program run with `runPromise`, a result slot and
 * an expected value check.
 */
const promiseCase = <A>(
  E: EffectModule,
  program: Effect<A, any>,
  check: (value: A) => void
): WorkloadInstance => {
  let result: { value: A } | undefined
  return {
    run: () =>
      E.Effect.runPromise(program).then((value) => {
        result = { value }
      }),
    validate: () => {
      assert(result !== undefined, "no result recorded")
      check(result!.value)
      result = undefined
    }
  }
}

// -----------------------------------------------------------------------------
// sync
// -----------------------------------------------------------------------------

const succeedFlatMapLoop: Workload = {
  name: "succeed-flatmap-loop",
  group: "sync",
  description:
    "Recursive flatMap(sync) loop of n steps: the core op dispatch and continuation push/pop of a single fiber.",
  size: { n: 100_000 },
  make: (E, size) => {
    const { Effect } = E
    const n = size.n
    const loop = (i: number, acc: number): Effect<number> =>
      i === n ? Effect.succeed(acc) : Effect.flatMap(Effect.sync(() => acc + i), (next) => loop(i + 1, next))
    return promiseCase(E, Effect.suspend(() => loop(0, 0)), (value) => expectEqual("sum", value, triangular(n)))
  }
}

const mapChainDeep: Workload = {
  name: "map-chain-deep",
  group: "sync",
  description: "Pre-built nested map chain: a deep continuation stack pushed then unwound, repeated per iteration.",
  size: { depth: 10_000, repeats: 10 },
  make: (E, size) => {
    const { Effect } = E
    const depth = size.depth
    const repeats = size.repeats
    let chain: Effect<number> = Effect.succeed(0)
    for (let i = 0; i < depth; i++) chain = Effect.map(chain, (x) => x + 1)
    const program = Effect.gen(function*() {
      let total = 0
      for (let r = 0; r < repeats; r++) total += yield* chain
      return total
    })
    return promiseCase(E, program, (value) => expectEqual("total", value, depth * repeats))
  }
}

const leftAssocFlatMapDeep: Workload = {
  name: "left-assoc-flatmap-deep",
  group: "sync",
  description:
    "Pre-built left-nested flatMap(succeed) chain: stack-safety push then pop through flatMap frames, repeated.",
  size: { depth: 10_000, repeats: 10 },
  make: (E, size) => {
    const { Effect } = E
    const depth = size.depth
    const repeats = size.repeats
    let chain: Effect<number> = Effect.succeed(0)
    for (let i = 0; i < depth; i++) chain = Effect.flatMap(chain, (x) => Effect.succeed(x + 1))
    const program = Effect.gen(function*() {
      let total = 0
      for (let r = 0; r < repeats; r++) total += yield* chain
      return total
    })
    return promiseCase(E, program, (value) => expectEqual("total", value, depth * repeats))
  }
}

const genLoop: Workload = {
  name: "gen-loop",
  group: "sync",
  description: "Effect.gen with many yield* steps alternating Effect.sync and Effect.succeed: generator adapter cost.",
  size: { steps: 50_000 },
  make: (E, size) => {
    const { Effect } = E
    const steps = size.steps
    const program = Effect.gen(function*() {
      let sum = 0
      for (let i = 0; i < steps; i++) {
        sum += (i & 1) === 0 ? yield* Effect.sync(() => i) : yield* Effect.succeed(i)
      }
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(steps)))
  }
}

const errorUnwind: Workload = {
  name: "error-unwind",
  group: "sync",
  description: "A failure under many map frames unwound to alternating catchCause / catch, repeated per iteration.",
  size: { frames: 1_000, repeats: 100 },
  make: (E, size) => {
    const { Effect } = E
    const frames = size.frames
    const repeats = size.repeats
    let failing: Effect<number, string> = Effect.fail("boom")
    for (let i = 0; i < frames; i++) failing = Effect.map(failing, (x) => x + 1)
    const viaCause = Effect.catchCause(failing, (cause) => Effect.succeed(cause.reasons.length))
    const viaCatch = Effect.catch(failing, (error) => Effect.succeed(error.length - 3))
    const program = Effect.gen(function*() {
      let total = 0
      for (let r = 0; r < repeats; r++) total += yield* (r & 1) === 0 ? viaCause : viaCatch
      return total
    })
    return promiseCase(E, program, (value) => expectEqual("recovered", value, repeats))
  }
}

const makeFinalizers = (failure: boolean): Workload => ({
  name: failure ? "finalizers-failure" : "finalizers-success",
  group: "sync",
  description: `Nested ensuring/onExit finalizers around a ${
    failure ? "failing" : "succeeding"
  } effect, repeated: finalizer frames on the ${failure ? "failure" : "success"} path.`,
  size: { finalizers: 128, repeats: 50 },
  make: (E, size) => {
    const { Effect } = E
    const finalizers = size.finalizers
    const repeats = size.repeats
    let ran = 0
    const finalizer = Effect.sync(() => {
      ran++
    })
    let inner: Effect<number, string> = failure ? Effect.fail("boom") : Effect.sync(() => 1)
    for (let i = 0; i < finalizers; i++) {
      inner = (i & 1) === 0 ? Effect.ensuring(inner, finalizer) : Effect.onExit(inner, () => finalizer)
    }
    const guarded = Effect.catch(inner, () => Effect.succeed(1))
    const program = Effect.gen(function*() {
      ran = 0
      let total = 0
      for (let r = 0; r < repeats; r++) total += yield* guarded
      return total
    })
    return promiseCase(E, program, (value) => {
      expectEqual("results", value, repeats)
      expectEqual("finalizers run", ran, finalizers * repeats)
    })
  }
})

const syncRunSync: Workload = {
  name: "sync-runSync",
  group: "sync",
  description: "Repeated Effect.runSync of a flatMap program: root fiber creation plus the sync scheduler.",
  size: { ops: 1_000, runs: 20 },
  make: (E, size) => {
    const { Effect } = E
    const ops = size.ops
    const runs = size.runs
    const loop = (i: number, acc: number): Effect<number> =>
      i === ops ? Effect.succeed(acc) : Effect.flatMap(Effect.sync(() => acc + i), (next) => loop(i + 1, next))
    const program = Effect.suspend(() => loop(0, 0))
    let total: number | undefined
    return {
      run: () => {
        let sum = 0
        for (let r = 0; r < runs; r++) sum += Effect.runSync(program)
        total = sum
      },
      validate: () => {
        expectEqual("total", total, triangular(ops) * runs)
        total = undefined
      }
    }
  }
}

// -----------------------------------------------------------------------------
// fiber
// -----------------------------------------------------------------------------

const forkJoinSequential: Workload = {
  name: "fork-join-sequential",
  group: "fiber",
  description: "Sequential forkChild + Fiber.join of a tiny effect: child fiber lifecycle and join wake-up.",
  size: { fibers: 5_000 },
  make: (E, size) => {
    const { Effect, Fiber } = E
    const fibers = size.fibers
    const program = Effect.gen(function*() {
      let sum = 0
      for (let i = 0; i < fibers; i++) {
        const fiber = yield* Effect.forkChild(Effect.sync(() => i))
        sum += yield* Fiber.join(fiber)
      }
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(fibers)))
  }
}

const forkFanoutJoinAll: Workload = {
  name: "fork-fanout-join-all",
  group: "fiber",
  description: "Fork many children, then Fiber.joinAll: bulk scheduling and many-observer join.",
  size: { fibers: 10_000 },
  make: (E, size) => {
    const { Effect, Fiber } = E
    const fibers = size.fibers
    const program = Effect.gen(function*() {
      const handles: Array<Fiber.Fiber<number>> = []
      for (let i = 0; i < fibers; i++) handles.push(yield* Effect.forkChild(Effect.sync(() => i)))
      const values = yield* Fiber.joinAll(handles)
      let sum = 0
      for (const value of values) sum += value
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(fibers)))
  }
}

const forEachBounded: Workload = {
  name: "forEach-bounded",
  group: "fiber",
  description: "Effect.forEach with bounded concurrency, each item yieldNow + sync: bounded worker pool scheduling.",
  size: { items: 10_000, concurrency: 16 },
  make: (E, size) => {
    const { Effect } = E
    const items = Array.from({ length: size.items }, (_, i) => i)
    const program = Effect.map(
      Effect.forEach(items, (i) => Effect.flatMap(Effect.yieldNow, () => Effect.sync(() => i * 2)), {
        concurrency: size.concurrency
      }),
      (values) => values.reduce((a, b) => a + b, 0)
    )
    return promiseCase(E, program, (value) => expectEqual("sum", value, 2 * triangular(items.length)))
  }
}

const forEachUnbounded: Workload = {
  name: "forEach-unbounded",
  group: "fiber",
  description: "Effect.forEach with unbounded concurrency and sync work: one fiber per item.",
  size: { items: 10_000 },
  make: (E, size) => {
    const { Effect } = E
    const items = Array.from({ length: size.items }, (_, i) => i)
    const program = Effect.map(
      Effect.forEach(items, (i) => Effect.sync(() => i * 2), { concurrency: "unbounded" }),
      (values) => values.reduce((a, b) => a + b, 0)
    )
    return promiseCase(E, program, (value) => expectEqual("sum", value, 2 * triangular(items.length)))
  }
}

const shortLivedFibers: Workload = {
  name: "short-lived-fibers",
  group: "fiber",
  description: "Repeated Effect.all of tiny effects with unbounded concurrency: short-lived fiber churn.",
  size: { effects: 1_000, repeats: 10 },
  make: (E, size) => {
    const { Effect } = E
    const count = size.effects
    const repeats = size.repeats
    const effects = Array.from({ length: count }, (_, i) => Effect.sync(() => i))
    const all = Effect.all(effects, { concurrency: "unbounded" })
    const program = Effect.gen(function*() {
      let sum = 0
      for (let r = 0; r < repeats; r++) {
        const values = yield* all
        for (const value of values) sum += value
      }
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(count) * repeats))
  }
}

// -----------------------------------------------------------------------------
// async
// -----------------------------------------------------------------------------

const callbackResume: Workload = {
  name: "callback-resume",
  group: "async",
  description: "Sequential Effect.callback resumed from queueMicrotask: async suspend/resume path.",
  size: { steps: 10_000 },
  make: (E, size) => {
    const { Effect } = E
    const steps = size.steps
    const program = Effect.gen(function*() {
      let sum = 0
      for (let i = 0; i < steps; i++) {
        sum += yield* Effect.callback<number>((resume) => {
          queueMicrotask(() => resume(Effect.succeed(i)))
        })
      }
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(steps)))
  }
}

const promiseInterop: Workload = {
  name: "promise-interop",
  group: "async",
  description: "Sequential Effect.promise(() => Promise.resolve(i)): Promise bridging and AbortSignal setup.",
  size: { steps: 10_000 },
  make: (E, size) => {
    const { Effect } = E
    const steps = size.steps
    const program = Effect.gen(function*() {
      let sum = 0
      for (let i = 0; i < steps; i++) sum += yield* Effect.promise(() => Promise.resolve(i))
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(steps)))
  }
}

const yieldContention: Workload = {
  name: "yield-contention",
  group: "async",
  description:
    "Many fibers each looping Effect.yieldNow: scheduler throughput under contention, plus fairness metrics (completion spread, max steps behind leader).",
  size: { fibers: 1_000, steps: 20 },
  make: (E, size) => {
    const { Effect } = E
    const fiberCount = size.fibers
    const steps = size.steps
    const ids = Array.from({ length: fiberCount }, (_, i) => i)
    const progress = new Int32Array(fiberCount)
    const completedAt = new Float64Array(fiberCount)
    let leader = 0
    let maxBehind = 0
    let totalSteps = 0
    let startedAt = 0
    const spreads: Array<number> = []
    const behinds: Array<number> = []
    const step = (id: number) =>
      Effect.sync(() => {
        const behind = leader - progress[id]
        if (behind > maxBehind) maxBehind = behind
        const next = ++progress[id]
        if (next > leader) leader = next
        totalSteps++
      })
    const worker = (id: number) =>
      Effect.gen(function*() {
        for (let s = 0; s < steps; s++) {
          yield* Effect.yieldNow
          yield* step(id)
        }
        completedAt[id] = performance.now()
      })
    const program = Effect.forEach(ids, worker, { concurrency: "unbounded", discard: true })
    let done = false
    return {
      run: () => {
        progress.fill(0)
        leader = 0
        maxBehind = 0
        totalSteps = 0
        startedAt = performance.now()
        return Effect.runPromise(program).then(() => {
          let first = Infinity
          let last = -Infinity
          for (let i = 0; i < fiberCount; i++) {
            if (completedAt[i] < first) first = completedAt[i]
            if (completedAt[i] > last) last = completedAt[i]
          }
          spreads.push((last - first) / Math.max(last - startedAt, 1e-9))
          behinds.push(maxBehind)
          done = true
        })
      },
      validate: () => {
        assert(done, "no result recorded")
        expectEqual("total steps", totalSteps, fiberCount * steps)
        for (let i = 0; i < fiberCount; i++) expectEqual(`fiber ${i} steps`, progress[i], steps)
        done = false
      },
      metrics: () => ({
        completionSpreadFraction: medianOf(spreads),
        completionSpreadFractionMax: Math.max(...spreads),
        maxStepsBehind: medianOf(behinds),
        maxStepsBehindMax: Math.max(...behinds)
      })
    }
  }
}

const deferredPingPong: Workload = {
  name: "deferred-pingpong",
  group: "async",
  description: "Two fibers alternating through per-round Deferreds: wake-up latency of await.",
  size: { handoffs: 10_000 },
  make: (E, size) => {
    const { Deferred, Effect, Fiber } = E
    const rounds = size.handoffs / 2
    const program = Effect.gen(function*() {
      const toB: Array<Deferred.Deferred<number>> = []
      const toA: Array<Deferred.Deferred<number>> = []
      for (let r = 0; r < rounds; r++) {
        toB.push(Deferred.makeUnsafe<number>())
        toA.push(Deferred.makeUnsafe<number>())
      }
      const b = yield* Effect.forkChild(Effect.gen(function*() {
        for (let r = 0; r < rounds; r++) {
          const value = yield* Deferred.await(toB[r])
          yield* Deferred.succeed(toA[r], value + 1)
        }
      }))
      let sum = 0
      for (let r = 0; r < rounds; r++) {
        yield* Deferred.succeed(toB[r], r)
        sum += yield* Deferred.await(toA[r])
      }
      yield* Fiber.join(b)
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(rounds) + rounds))
  }
}

// -----------------------------------------------------------------------------
// interruption, scopes, context
// -----------------------------------------------------------------------------

const interruptSuspended: Workload = {
  name: "interrupt-suspended",
  group: "interruption",
  description: "Fork fibers suspended on Effect.never, then Fiber.interruptAll: interruption of parked fibers.",
  size: { fibers: 2_000 },
  make: (E, size) => {
    const { Effect, Exit, Fiber } = E
    const fibers = size.fibers
    const program = Effect.gen(function*() {
      const handles: Array<Fiber.Fiber<never>> = []
      for (let i = 0; i < fibers; i++) handles.push(yield* Effect.forkChild(Effect.never))
      yield* Effect.yieldNow
      yield* Fiber.interruptAll(handles)
      let interrupted = 0
      for (const handle of handles) {
        const exit = handle.pollUnsafe()
        if (exit !== undefined && Exit.hasInterrupts(exit)) interrupted++
      }
      return interrupted
    })
    return promiseCase(E, program, (value) => expectEqual("interrupted", value, fibers))
  }
}

const race: Workload = {
  name: "race",
  group: "interruption",
  description: "Sequential Effect.race(never, yieldNow-then-succeed): two forks, a winner and loser interruption.",
  size: { races: 2_000 },
  make: (E, size) => {
    const { Effect } = E
    const races = size.races
    const program = Effect.gen(function*() {
      let sum = 0
      for (let i = 0; i < races; i++) {
        sum += yield* Effect.race(Effect.never, Effect.as(Effect.yieldNow, i))
      }
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(races)))
  }
}

const timeout: Workload = {
  name: "timeout",
  group: "interruption",
  description: "Sequential Effect.timeout(yieldNow-then-succeed, 1 second): timer setup/cancel and race.",
  size: { timeouts: 1_000 },
  make: (E, size) => {
    const { Effect } = E
    const count = size.timeouts
    const program = Effect.gen(function*() {
      let sum = 0
      for (let i = 0; i < count; i++) sum += yield* Effect.timeout(Effect.as(Effect.yieldNow, i), "1 second")
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(count)))
  }
}

const scopeFinalizers: Workload = {
  name: "scope-finalizers",
  group: "interruption",
  description:
    "Repeated Effect.scoped with several acquireRelease each: scope creation, finalizer registration and close.",
  size: { scopes: 500, resources: 10 },
  make: (E, size) => {
    const { Effect } = E
    const scopes = size.scopes
    const resources = size.resources
    let released = 0
    const resource = (j: number) =>
      Effect.acquireRelease(Effect.sync(() => j), () =>
        Effect.sync(() => {
          released++
        }))
    const scoped = Effect.scoped(Effect.gen(function*() {
      let sum = 0
      for (let j = 0; j < resources; j++) sum += yield* resource(j)
      return sum
    }))
    const program = Effect.gen(function*() {
      released = 0
      let total = 0
      for (let s = 0; s < scopes; s++) total += yield* scoped
      return total
    })
    return promiseCase(E, program, (value) => {
      expectEqual("acquired sum", value, triangular(resources) * scopes)
      expectEqual("released", released, resources * scopes)
    })
  }
}

const contextLocals: Workload = {
  name: "context-locals",
  group: "interruption",
  description: "Repeated Effect.provideService plus a service read and a References read: fiber context updates.",
  size: { steps: 10_000 },
  make: (E, size) => {
    const { Context, Effect, References } = E
    const steps = size.steps
    const Counter = Context.Service<{ readonly value: number }>("bench/fiber/Counter")
    const read = Effect.gen(function*() {
      const counter = yield* Effect.service(Counter)
      const level = yield* Effect.service(References.CurrentLogLevel)
      return level.length > 0 ? counter.value : -1
    })
    const program = Effect.gen(function*() {
      let sum = 0
      for (let i = 0; i < steps; i++) sum += yield* Effect.provideService(read, Counter, { value: i })
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(steps)))
  }
}

const tracingSpans: Workload = {
  name: "tracing-spans",
  group: "interruption",
  description: "Sequential Effect.withSpan with the default tracer, each reading Effect.currentSpan.",
  size: { spans: 5_000 },
  make: (E, size) => {
    const { Effect } = E
    const spans = size.spans
    const traced = Effect.withSpan(
      Effect.map(Effect.currentSpan, (span) => span.name === "bench-span" ? 1 : 0),
      "bench-span"
    )
    const program = Effect.gen(function*() {
      let count = 0
      for (let i = 0; i < spans; i++) count += yield* traced
      return count
    })
    return promiseCase(E, program, (value) => expectEqual("spans", value, spans))
  }
}

// -----------------------------------------------------------------------------
// queue
// -----------------------------------------------------------------------------

const queueBoundedPC: Workload = {
  name: "queue-bounded-pc",
  group: "queue",
  description: "Small Queue.bounded with 1 producer and 1 consumer fiber: backpressure handoff.",
  size: { messages: 20_000, capacity: 16 },
  make: (E, size) => {
    const { Effect, Fiber, Queue } = E
    const messages = size.messages
    const program = Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(size.capacity)
      const producer = yield* Effect.forkChild(Effect.gen(function*() {
        for (let i = 0; i < messages; i++) yield* Queue.offer(queue, i)
      }))
      let sum = 0
      for (let i = 0; i < messages; i++) sum += yield* Queue.take(queue)
      yield* Fiber.join(producer)
      return sum
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(messages)))
  }
}

const queueMpmc: Workload = {
  name: "queue-mpmc",
  group: "queue",
  description: "Unbounded queue with several producers and consumers: multi-waiter take.",
  size: { messages: 20_000, producers: 4, consumers: 4 },
  make: (E, size) => {
    const { Effect, Fiber, Queue } = E
    const messages = size.messages
    const producers = size.producers
    const consumers = size.consumers
    const perProducer = messages / producers
    const perConsumer = messages / consumers
    const program = Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      const producerFibers: Array<Fiber.Fiber<void>> = []
      for (let p = 0; p < producers; p++) {
        producerFibers.push(
          yield* Effect.forkChild(Effect.gen(function*() {
            for (let i = 0; i < perProducer; i++) yield* Queue.offer(queue, p * perProducer + i)
          }))
        )
      }
      const consumerFibers: Array<Fiber.Fiber<number>> = []
      for (let c = 0; c < consumers; c++) {
        consumerFibers.push(
          yield* Effect.forkChild(Effect.gen(function*() {
            let sum = 0
            for (let i = 0; i < perConsumer; i++) sum += yield* Queue.take(queue)
            return sum
          }))
        )
      }
      yield* Fiber.joinAll(producerFibers)
      const sums = yield* Fiber.joinAll(consumerFibers)
      return sums.reduce((a, b) => a + b, 0)
    })
    return promiseCase(E, program, (value) => expectEqual("sum", value, triangular(messages)))
  }
}

// -----------------------------------------------------------------------------
// mixed
// -----------------------------------------------------------------------------

const mixedService: Workload = {
  name: "mixed-service",
  group: "mixed",
  description:
    "Simulated requests via bounded forEach: Effect.fn span, Layer service, gen steps, semaphore permit, promise step, scoped resource, queue offer to a consumer fiber, 10% typed failures recovered with catchTag.",
  size: { requests: 500, concurrency: 64, permits: 8 },
  make: (E, size) => {
    const { Context, Data, Effect, Fiber, Layer, Queue, Semaphore } = E
    const requests = size.requests
    const permits = size.permits
    class RequestError extends Data.TaggedError("RequestError")<{ readonly id: number }> {}
    const Db = Context.Service<{ readonly lookup: (id: number) => number }>("bench/fiber/Db")
    const DbLive = Layer.succeed(Db, { lookup: (id: number) => id * 2 })
    const ids = Array.from({ length: requests }, (_, i) => i)
    let open = 0
    let released = 0
    let inPermit = 0
    let maxInPermit = 0
    const handler = Effect.fn("handler")(function*(id: number, semaphore: Semaphore.Semaphore) {
      const db = yield* Effect.service(Db)
      let acc = db.lookup(id)
      for (let k = 0; k < 3; k++) acc += yield* Effect.sync(() => k)
      const fetched = yield* Semaphore.withPermits(
        semaphore,
        1,
        Effect.suspend(() => {
          inPermit++
          if (inPermit > maxInPermit) maxInPermit = inPermit
          return Effect.ensuring(
            Effect.promise(() => Promise.resolve(acc)),
            Effect.sync(() => {
              inPermit--
            })
          )
        })
      )
      return yield* Effect.scoped(Effect.gen(function*() {
        const resource = yield* Effect.acquireRelease(
          Effect.sync(() => {
            open++
            return fetched
          }),
          () =>
            Effect.sync(() => {
              open--
              released++
            })
        )
        if (id % 10 === 0) return yield* new RequestError({ id })
        return resource
      }))
    })
    const request = (id: number, semaphore: Semaphore.Semaphore, queue: Queue.Queue<number>) =>
      handler(id, semaphore).pipe(
        Effect.catchTag("RequestError", (error) => Effect.succeed(-1 - error.id)),
        Effect.flatMap((value) => Queue.offer(queue, value))
      )
    const program = Effect.gen(function*() {
      open = 0
      released = 0
      inPermit = 0
      maxInPermit = 0
      const semaphore = yield* Semaphore.make(permits)
      const queue = yield* Queue.unbounded<number>()
      const consumer = yield* Effect.forkChild(Effect.gen(function*() {
        let failures = 0
        let sum = 0
        for (let i = 0; i < requests; i++) {
          const value = yield* Queue.take(queue)
          if (value < 0) failures++
          else sum += value
        }
        return { failures, sum }
      }))
      yield* Effect.forEach(ids, (id) => request(id, semaphore, queue), {
        concurrency: size.concurrency,
        discard: true
      })
      return yield* Fiber.join(consumer)
    }).pipe(Effect.provide(DbLive))
    let expectedSum = 0
    let expectedFailures = 0
    for (const id of ids) {
      if (id % 10 === 0) expectedFailures++
      else expectedSum += id * 2 + 3
    }
    return promiseCase(E, program, (value) => {
      expectEqual("failures", value.failures, expectedFailures)
      expectEqual("sum", value.sum, expectedSum)
      expectEqual("open resources", open, 0)
      expectEqual("released resources", released, requests)
      assert(maxInPermit <= permits && maxInPermit > 0, `max concurrent permits ${maxInPermit}`)
    })
  }
}

export const workloads: ReadonlyArray<Workload> = [
  succeedFlatMapLoop,
  mapChainDeep,
  leftAssocFlatMapDeep,
  genLoop,
  errorUnwind,
  makeFinalizers(false),
  makeFinalizers(true),
  syncRunSync,
  forkJoinSequential,
  forkFanoutJoinAll,
  forEachBounded,
  forEachUnbounded,
  shortLivedFibers,
  callbackResume,
  promiseInterop,
  yieldContention,
  deferredPingPong,
  interruptSuspended,
  race,
  timeout,
  scopeFinalizers,
  contextLocals,
  tracingSpans,
  queueBoundedPC,
  queueMpmc,
  mixedService
]

export const groups = ["sync", "fiber", "async", "interruption", "queue", "mixed"] as const

export const findWorkload = (name: string): Workload => {
  const workload = workloads.find((w) => w.name === name)
  if (workload === undefined) {
    throw new Error(`Unknown workload ${name}. Known: ${workloads.map((w) => w.name).join(", ")}`)
  }
  return workload
}
