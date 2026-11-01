import { assert, describe, it } from "@effect/vitest"
import {
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Latch,
  ManagedRuntime,
  PartitionedSemaphore,
  Pool,
  PubSub,
  Queue,
  Request,
  RequestResolver,
  Scope,
  Semaphore,
  Supervisor,
  TxRef
} from "effect"
import { TestClock } from "effect/testing"

class GetValue extends Request.Class<{ id: number }, number> {}

type Event =
  | { readonly _tag: "start"; readonly fiber: Fiber.Fiber<unknown, unknown>; readonly parent: unknown }
  | { readonly _tag: "end"; readonly fiber: Fiber.Fiber<unknown, unknown>; readonly exit: Exit.Exit<unknown, unknown> }
  | {
    readonly _tag: "block"
    readonly fiber: Fiber.Fiber<unknown, unknown>
    readonly blockedOn: unknown
    // what a collection held when the block was reported
    readonly members: ReadonlyArray<unknown> | undefined
  }
  | { readonly _tag: "unblock"; readonly fiber: Fiber.Fiber<unknown, unknown> }
  | { readonly _tag: "mark"; readonly label: string }

const recorder = () => {
  const events: Array<Event> = []
  const supervisor: Supervisor.Supervisor = {
    onStart: (fiber, parent) => events.push({ _tag: "start", fiber, parent }),
    onEnd: (fiber, exit) => events.push({ _tag: "end", fiber, exit }),
    onBlock: (fiber, blockedOn) =>
      events.push({
        _tag: "block",
        fiber,
        blockedOn,
        members: Array.isArray(blockedOn) || blockedOn instanceof Set ? Array.from(blockedOn) : undefined
      }),
    onUnblock: (fiber) => events.push({ _tag: "unblock", fiber })
  }
  const mark = (label: string) => Effect.sync(() => events.push({ _tag: "mark", label }))
  const tagsOf = (fiber: Fiber.Fiber<unknown, unknown>) =>
    events.flatMap((event) => event._tag !== "mark" && event.fiber === fiber ? [event._tag] : [])
  return { events, supervisor, mark, tagsOf }
}

const logging = (log: Array<string>, name: string): Supervisor.Supervisor => ({
  onStart: () => log.push(`${name} start`),
  onEnd: () => log.push(`${name} end`),
  onBlock: () => log.push(`${name} block`),
  onUnblock: () => log.push(`${name} unblock`)
})

// Runs `wait` in a fiber under a recording Supervisor and returns the block it reported
const blockOf = Effect.fnUntraced(function*<A, E>(wait: Effect.Effect<A, E>) {
  const { events, supervisor } = recorder()
  const fiber = yield* Effect.forkChild(wait, { startImmediately: true }).pipe(
    Effect.provideService(Supervisor.Supervisor, supervisor)
  )
  const block = events.find((event) => event._tag === "block" && event.fiber === fiber)
  yield* Fiber.interrupt(fiber)
  assert(block?._tag === "block", "the fiber did not block")
  return block
})

describe("Supervisor", () => {
  describe("events", () => {
    it.effect("a fork reports the forker as parent before the forker continues, and a root fiber has none", () =>
      Effect.gen(function*() {
        const { events, mark, supervisor } = recorder()
        const forker = yield* Effect.fiber
        const [child, detached, root] = yield* Effect.gen(function*() {
          const child = yield* Effect.forkChild(Effect.void)
          yield* mark("forker continues")
          const detached = yield* Effect.forkDetach(Effect.void)
          const root = Effect.runForkWith(Context.make(Supervisor.Supervisor, supervisor))(Effect.void)
          return [child, detached, root] as const
        }).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        assert.deepStrictEqual(events.filter((event) => event._tag === "start" || event._tag === "mark"), [
          { _tag: "start", fiber: child, parent: forker },
          { _tag: "mark", label: "forker continues" },
          { _tag: "start", fiber: detached, parent: forker },
          { _tag: "start", fiber: root, parent: undefined }
        ])
      }))

    it.effect("a fork into a closed scope starts with the forker as parent and ends interrupted", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const forker = yield* Effect.fiber
        const scope = yield* Scope.make()
        yield* Scope.close(scope, Exit.void)
        const child = yield* Effect.forkIn(Effect.void, scope).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        assert.deepStrictEqual(events[0], { _tag: "start", fiber: child, parent: forker })
        assert.isTrue(events[1]._tag === "end" && Exit.hasInterrupts(events[1].exit))
        assert.strictEqual(events.length, 2)
      }))

    it.effect("the shared fiber of a cached effect reports the fiber that asked first as parent", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const cached = yield* Effect.cached(Effect.void)
        const first = yield* Effect.forkChild(cached).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        yield* Fiber.join(first)
        const parents = events.flatMap((event) => event._tag === "start" && event.fiber !== first ? [event.parent] : [])
        assert.deepStrictEqual(parents, [first])
      }))

    it.effect("a wait that completes at once, or a yield, does not block", () =>
      Effect.gen(function*() {
        const { supervisor, tagsOf } = recorder()
        const deferred = Deferred.makeUnsafe<number>()
        Deferred.doneUnsafe(deferred, Exit.succeed(1))
        const child = yield* Effect.forkChild(Effect.andThen(Deferred.await(deferred), Effect.yieldNow)).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        yield* Fiber.join(child)
        assert.deepStrictEqual(tagsOf(child), ["start", "end"])
      }))

    it.effect("a blocked fiber unblocks when its wait completes or it is interrupted", () =>
      Effect.gen(function*() {
        const { events, supervisor, tagsOf } = recorder()
        const deferred = Deferred.makeUnsafe<number>()
        const [completed, interrupted] = yield* Effect.all([
          Effect.forkChild(Deferred.await(deferred), { startImmediately: true }),
          Effect.forkChild(Effect.never, { startImmediately: true })
        ]).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        assert.deepStrictEqual(tagsOf(completed), ["start", "block"])
        yield* Deferred.succeed(deferred, 1)
        yield* Fiber.join(completed)
        yield* Fiber.interrupt(interrupted)
        assert.deepStrictEqual(tagsOf(completed), ["start", "block", "unblock", "end"])
        assert.deepStrictEqual(tagsOf(interrupted), ["start", "block", "unblock", "end"])
        const end = events.find((event) => event._tag === "end" && event.fiber === interrupted)
        assert.isTrue(end?._tag === "end" && Exit.hasInterrupts(end.exit))
      }))

    it.effect("a fiber ends before the fiber joining it unblocks", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const deferred = Deferred.makeUnsafe<void>()
        const [joiner, joined] = yield* Effect.gen(function*() {
          const joined = yield* Effect.forkChild(Deferred.await(deferred), { startImmediately: true })
          const joiner = yield* Effect.forkChild(Fiber.join(joined), { startImmediately: true })
          return [joiner, joined] as const
        }).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        yield* Deferred.succeed(deferred, void 0)
        yield* Fiber.join(joiner)
        const ends = events.findIndex((event) => event._tag === "end" && event.fiber === joined)
        const unblocks = events.findIndex((event) => event._tag === "unblock" && event.fiber === joiner)
        assert.isTrue(ends !== -1 && ends < unblocks)
      }))

    it.effect("a fiber keeps its first Supervisor when its context changes, and its forks take the new one", () =>
      Effect.gen(function*() {
        const first = recorder()
        const second = recorder()
        const deferred = Deferred.makeUnsafe<void>()
        const outer = yield* Effect.gen(function*() {
          const inner = yield* Effect.forkChild(Effect.void)
          yield* Deferred.await(deferred)
          return inner
        }).pipe(
          Effect.provideService(Supervisor.Supervisor, second.supervisor),
          Effect.forkChild({ startImmediately: true }),
          Effect.provideService(Supervisor.Supervisor, first.supervisor)
        )
        yield* Deferred.succeed(deferred, void 0)
        const inner = yield* Fiber.join(outer)
        assert.deepStrictEqual(first.tagsOf(outer), ["start", "block", "unblock", "end"])
        assert.deepStrictEqual(second.tagsOf(outer), [])
        assert.deepStrictEqual(second.tagsOf(inner), ["start", "end"])
        assert.deepStrictEqual(first.tagsOf(inner), [])
      }))
  })

  describe("blocked on", () => {
    it.effect("Deferred, Latch, Semaphore, PartitionedSemaphore and Pool waits report the primitive", () =>
      Effect.gen(function*() {
        const deferred = Deferred.makeUnsafe<void>()
        const latch = Latch.makeUnsafe()
        const semaphore = Semaphore.makeUnsafe(0)
        const partitioned = PartitionedSemaphore.makeUnsafe<string>({ permits: 1 })
        yield* PartitionedSemaphore.take(partitioned, "key", 1)
        const pool = yield* Pool.make({ acquire: Effect.succeed(1), size: 1 })
        yield* Pool.get(pool)
        assert.strictEqual((yield* blockOf(Deferred.await(deferred))).blockedOn, deferred)
        assert.strictEqual((yield* blockOf(latch.await)).blockedOn, latch)
        assert.strictEqual((yield* blockOf(Semaphore.take(semaphore, 1))).blockedOn, semaphore)
        assert.strictEqual((yield* blockOf(PartitionedSemaphore.take(partitioned, "key", 1))).blockedOn, partitioned)
        assert.strictEqual((yield* blockOf(Effect.scoped(Pool.get(pool)))).blockedOn, pool)
      }).pipe(Effect.scoped))

    it.effect("Queue waits report the Queue, PubSub take the Subscription, and PubSub publish the PubSub", () =>
      Effect.gen(function*() {
        const empty = yield* Queue.bounded<number>(1)
        const full = yield* Queue.bounded<number>(1)
        yield* Queue.offer(full, 1)
        assert.strictEqual((yield* blockOf(Queue.take(empty))).blockedOn, empty)
        assert.strictEqual((yield* blockOf(Queue.await(empty))).blockedOn, empty)
        assert.strictEqual((yield* blockOf(Queue.offer(full, 2))).blockedOn, full)
        assert.strictEqual((yield* blockOf(Queue.offerAll(full, [2]))).blockedOn, full)
        const pubsub = yield* PubSub.bounded<number>(1)
        const subscription = yield* PubSub.subscribe(pubsub)
        assert.strictEqual((yield* blockOf(PubSub.take(subscription))).blockedOn, subscription)
        yield* PubSub.publish(pubsub, 1)
        assert.strictEqual((yield* blockOf(PubSub.publish(pubsub, 2))).blockedOn, pubsub)
      }).pipe(Effect.scoped))

    it.effect("Fiber waits report the fiber, or an array of the fibers read once from the iterable", () =>
      Effect.gen(function*() {
        const first = yield* Effect.forkChild(Effect.never)
        const second = yield* Effect.forkChild(Effect.never)
        const once = function*() {
          yield first
          yield second
        }
        assert.strictEqual((yield* blockOf(Fiber.await(first))).blockedOn, first)
        assert.strictEqual((yield* blockOf(Fiber.join(first))).blockedOn, first)
        for (const block of [yield* blockOf(Fiber.awaitAll(once())), yield* blockOf(Fiber.joinAll(once()))]) {
          assert.isTrue(Array.isArray(block.blockedOn))
          assert.deepStrictEqual(block.members, [first, second])
        }
      }))

    it.effect("races and a concurrent forEach report the Set of fibers they forked", () =>
      Effect.gen(function*() {
        const waits = [
          Effect.race(Effect.never, Effect.never),
          Effect.raceAll([Effect.never, Effect.never]),
          Effect.raceFirst(Effect.never, Effect.never),
          Effect.forEach([1, 2], () => Effect.never, { concurrency: "unbounded" })
        ]
        for (const wait of waits) {
          const block = yield* blockOf(wait)
          assert.instanceOf(block.blockedOn, Set)
          assert.strictEqual(block.members?.length, 2)
          assert.isTrue(block.members?.every((member) => Fiber.isFiber(member)))
        }
      }))

    it.effect("RequestResolver.fromEffect reports the Set of fibers it forked", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const resolver = RequestResolver.fromEffect<GetValue>(() => Effect.never)
        const fiber = yield* Effect.forkChild(
          Effect.all([
            Effect.request(new GetValue({ id: 1 }), resolver),
            Effect.request(new GetValue({ id: 2 }), resolver)
          ], { concurrency: "unbounded" }),
          { startImmediately: true }
        ).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        yield* Effect.yieldNow
        yield* Fiber.interrupt(fiber)
        const block = events.find((event) =>
          event._tag === "block" && event.fiber !== fiber && event.blockedOn instanceof Set
        )
        assert.isTrue(block?._tag === "block" && block.members?.length === 2)
      }))

    it.effect("a transaction that retries reports an array of the TxRefs it read", () =>
      Effect.gen(function*() {
        const first = yield* TxRef.make(0)
        const second = yield* TxRef.make(0)
        const block = yield* blockOf(Effect.tx(Effect.gen(function*() {
          yield* TxRef.get(first)
          yield* TxRef.get(second)
          return yield* Effect.txRetry
        })))
        assert.isTrue(Array.isArray(block.blockedOn))
        assert.deepStrictEqual(block.members, [first, second])
      }))

    it.effect("Effect.never reports itself, and external waits report undefined", () =>
      Effect.gen(function*() {
        assert.strictEqual((yield* blockOf(Effect.never)).blockedOn, Effect.never)
        assert.isUndefined((yield* blockOf(Effect.callback<void>(() => {}))).blockedOn)
        assert.isUndefined((yield* blockOf(Effect.promise(() => new Promise<void>(() => {})))).blockedOn)
        assert.isUndefined((yield* blockOf(TestClock.withLive(Effect.sleep("1 hour")))).blockedOn)
      }))
  })

  describe("installation and composition", () => {
    it.effect("combine calls the outer Supervisor before the inner on every hook", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        const combined = Supervisor.combine(logging(log, "outer"), logging(log, "inner"))
        const fiber = yield* Effect.fiber
        combined.onStart(fiber, undefined)
        combined.onBlock(fiber, undefined)
        combined.onUnblock(fiber)
        combined.onEnd(fiber, Exit.void)
        assert.deepStrictEqual(log, [
          "outer start",
          "inner start",
          "outer block",
          "inner block",
          "outer unblock",
          "inner unblock",
          "outer end",
          "inner end"
        ])
      }))

    it.effect("combine calls each Supervisor once, even when the combinations overlap", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        const a = logging(log, "a")
        const b = logging(log, "b")
        const c = logging(log, "c")
        const ab = Supervisor.combine(a, b)
        assert.strictEqual(Supervisor.combine(a, a), a)
        assert.strictEqual(Supervisor.combine(ab, b), ab)
        assert.strictEqual(Supervisor.combine(b)(ab), ab)
        const fiber = yield* Effect.fiber
        const starts = (supervisor: Supervisor.Supervisor) => {
          log.length = 0
          supervisor.onStart(fiber, undefined)
          return [...log]
        }
        assert.deepStrictEqual(starts(Supervisor.combine(ab, Supervisor.combine(b, c))), [
          "a start",
          "b start",
          "c start"
        ])
        assert.deepStrictEqual(starts(Supervisor.combine(a, ab)), ["a start", "b start"])
      }))

    it.effect("Supervisor.layer adds to the Supervisor in place, unless it is already there", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        const a = logging(log, "a")
        yield* Effect.forkChild(Effect.void).pipe(
          Effect.andThen(Effect.yieldNow),
          Effect.provide(Supervisor.layer(a)),
          Effect.provide(Supervisor.layer(logging(log, "b"))),
          Effect.provideService(Supervisor.Supervisor, a)
        )
        assert.deepStrictEqual(log, ["a start", "b start", "a end", "b end"])
      }))

    it.effect("providing the reference replaces the Supervisor in place, and undefined opts out", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        yield* Effect.forkChild(Effect.void).pipe(
          Effect.andThen(Effect.forkChild(Effect.void).pipe(Effect.provideService(Supervisor.Supervisor, undefined))),
          Effect.andThen(Effect.yieldNow),
          Effect.provideService(Supervisor.Supervisor, logging(log, "b")),
          Effect.provideService(Supervisor.Supervisor, logging(log, "a"))
        )
        assert.deepStrictEqual(log, ["b start", "b end"])
      }))

    it.effect("Effect.withSupervisor observes its own child fiber and what it forks, and returns the result", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const caller = yield* Effect.fiber
        const [region, forked, result] = yield* Effect.gen(function*() {
          const forked = yield* Effect.forkChild(Effect.void)
          return [yield* Effect.fiber, forked, "result"] as const
        }).pipe(Effect.withSupervisor(supervisor))
        assert.strictEqual(result, "result")
        assert.notStrictEqual(region, caller)
        const starts = events.flatMap((event) => event._tag === "start" ? [[event.fiber, event.parent]] : [])
        assert.deepStrictEqual(starts, [[region, caller], [forked, region]])
      }))

    it.effect("Effect.withSupervisor shows an outer Supervisor the caller blocked on its child", () =>
      Effect.gen(function*() {
        const outer = recorder()
        const inner = recorder()
        const caller = yield* Effect.forkChild(
          Effect.withSupervisor(Effect.yieldNow, inner.supervisor),
          { startImmediately: true }
        ).pipe(Effect.provideService(Supervisor.Supervisor, outer.supervisor))
        yield* Fiber.join(caller)
        const region = outer.events.find((event) => event._tag === "start" && event.fiber !== caller)
        const block = outer.events.find((event) => event._tag === "block" && event.fiber === caller)
        assert.isTrue(region?._tag === "start" && block?._tag === "block" && block.blockedOn === region.fiber)
      }))

    it("Supervisor.layer under a built ManagedRuntime observes the root fiber", async () => {
      const { events, supervisor } = recorder()
      const runtime = ManagedRuntime.make(Supervisor.layer(supervisor))
      await runtime.runPromise(Effect.void)
      events.length = 0
      const root = runtime.runFork(Effect.void)
      await runtime.runPromise(Fiber.await(root))
      assert.deepStrictEqual(events[0], { _tag: "start", fiber: root, parent: undefined })
      await runtime.dispose()
    })
  })
})
