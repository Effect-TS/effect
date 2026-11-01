import { assert, describe, it } from "@effect/vitest"
import {
  Context,
  Data,
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

// Runs `wait` in a fiber under a recording Supervisor and returns the block it reported
const blockOf = <A, E>(wait: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
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
    it.effect("a fork reports its start, with the forker as parent, before the forker continues", () =>
      Effect.gen(function*() {
        const { events, mark, supervisor } = recorder()
        const forker = yield* Effect.fiber
        const child = yield* Effect.gen(function*() {
          const child = yield* Effect.forkChild(Effect.void)
          yield* mark("forker continues")
          return child
        }).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        assert.deepStrictEqual(events.slice(0, 2), [
          { _tag: "start", fiber: child, parent: forker },
          { _tag: "mark", label: "forker continues" }
        ])
      }))

    it.effect("a detached fork reports the forker as parent", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const forker = yield* Effect.fiber
        const child = yield* Effect.forkDetach(Effect.void).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        assert.deepStrictEqual(events[0], { _tag: "start", fiber: child, parent: forker })
      }))

    it.effect("a root fiber has no parent, even when run from inside a fiber", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const root = yield* Effect.sync(() =>
          Effect.runForkWith(Context.make(Supervisor.Supervisor, supervisor))(Effect.void)
        )
        assert.deepStrictEqual(events[0], { _tag: "start", fiber: root, parent: undefined })
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
        assert.deepStrictEqual(events.map((event) => event._tag), ["start", "end"])
        assert.deepStrictEqual(events[0], { _tag: "start", fiber: child, parent: forker })
        assert.isTrue(events[1]._tag === "end" && Exit.hasInterrupts(events[1].exit))
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

    it.effect("a wait that completes at once does not block", () =>
      Effect.gen(function*() {
        const { supervisor, tagsOf } = recorder()
        const deferred = Deferred.makeUnsafe<number>()
        Deferred.doneUnsafe(deferred, Exit.succeed(1))
        const queue = yield* Queue.unbounded<number>()
        yield* Queue.offer(queue, 1)
        const child = yield* Effect.forkChild(Effect.andThen(Deferred.await(deferred), Queue.take(queue))).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        yield* Fiber.join(child)
        assert.deepStrictEqual(tagsOf(child), ["start", "end"])
      }))

    it.effect("yielding does not block", () =>
      Effect.gen(function*() {
        const { supervisor, tagsOf } = recorder()
        const child = yield* Effect.forkChild(Effect.yieldNow).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        yield* Fiber.join(child)
        assert.deepStrictEqual(tagsOf(child), ["start", "end"])
      }))

    it.effect("a wait that suspends reports a block, then an unblock when it completes", () =>
      Effect.gen(function*() {
        const { supervisor, tagsOf } = recorder()
        const deferred = Deferred.makeUnsafe<number>()
        const child = yield* Effect.forkChild(Deferred.await(deferred), { startImmediately: true }).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        assert.deepStrictEqual(tagsOf(child), ["start", "block"])
        yield* Deferred.succeed(deferred, 1)
        yield* Fiber.join(child)
        assert.deepStrictEqual(tagsOf(child), ["start", "block", "unblock", "end"])
      }))

    it.effect("a fiber interrupted while blocked unblocks, then ends interrupted", () =>
      Effect.gen(function*() {
        const { events, supervisor, tagsOf } = recorder()
        const child = yield* Effect.forkChild(Effect.never, { startImmediately: true }).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        yield* Fiber.interrupt(child)
        assert.deepStrictEqual(tagsOf(child), ["start", "block", "unblock", "end"])
        const end = events.find((event) => event._tag === "end")
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

    it.effect("providing undefined opts a region's forks out", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        yield* Effect.forkChild(Effect.void).pipe(
          Effect.provideService(Supervisor.Supervisor, undefined),
          Effect.andThen(Effect.yieldNow),
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        assert.deepStrictEqual(events, [])
      }))
  })

  describe("blocked on", () => {
    it.effect("Deferred.await reports the Deferred", () =>
      Effect.gen(function*() {
        const deferred = Deferred.makeUnsafe<void>()
        assert.strictEqual((yield* blockOf(Deferred.await(deferred))).blockedOn, deferred)
      }))

    it.effect("Queue take, offer and await report the Queue", () =>
      Effect.gen(function*() {
        const empty = yield* Queue.bounded<number>(1)
        const full = yield* Queue.bounded<number>(1)
        yield* Queue.offer(full, 1)
        assert.strictEqual((yield* blockOf(Queue.take(empty))).blockedOn, empty)
        assert.strictEqual((yield* blockOf(Queue.offer(full, 2))).blockedOn, full)
        assert.strictEqual((yield* blockOf(Queue.offerAll(full, [2]))).blockedOn, full)
        assert.strictEqual((yield* blockOf(Queue.await(empty))).blockedOn, empty)
      }))

    it.effect("PubSub publish reports the PubSub, and take reports the Subscription", () =>
      Effect.gen(function*() {
        const pubsub = yield* PubSub.bounded<number>(1)
        const subscription = yield* PubSub.subscribe(pubsub)
        assert.strictEqual((yield* blockOf(PubSub.take(subscription))).blockedOn, subscription)
        yield* PubSub.publish(pubsub, 1)
        assert.strictEqual((yield* blockOf(PubSub.publish(pubsub, 2))).blockedOn, pubsub)
      }).pipe(Effect.scoped))

    it.effect("Latch.await reports the Latch", () =>
      Effect.gen(function*() {
        const latch = Latch.makeUnsafe()
        assert.strictEqual((yield* blockOf(latch.await)).blockedOn, latch)
      }))

    it.effect("Semaphore and PartitionedSemaphore report themselves", () =>
      Effect.gen(function*() {
        const semaphore = Semaphore.makeUnsafe(0)
        const partitioned = PartitionedSemaphore.makeUnsafe<string>({ permits: 1 })
        yield* PartitionedSemaphore.take(partitioned, "key", 1)
        assert.strictEqual((yield* blockOf(Semaphore.take(semaphore, 1))).blockedOn, semaphore)
        assert.strictEqual((yield* blockOf(PartitionedSemaphore.take(partitioned, "key", 1))).blockedOn, partitioned)
      }))

    it.effect("Pool.get on an exhausted pool reports the Pool", () =>
      Effect.gen(function*() {
        const pool = yield* Pool.make({ acquire: Effect.succeed(1), size: 1 })
        yield* Pool.get(pool)
        assert.strictEqual((yield* blockOf(Effect.scoped(Pool.get(pool)))).blockedOn, pool)
      }).pipe(Effect.scoped))

    it.effect("Fiber.await and Fiber.join report the fiber", () =>
      Effect.gen(function*() {
        const fiber = yield* Effect.forkChild(Effect.never)
        assert.strictEqual((yield* blockOf(Fiber.await(fiber))).blockedOn, fiber)
        assert.strictEqual((yield* blockOf(Fiber.join(fiber))).blockedOn, fiber)
      }))

    it.effect("Fiber.awaitAll and Fiber.joinAll report an array of the fibers", () =>
      Effect.gen(function*() {
        const fibers = new Set([yield* Effect.forkChild(Effect.never), yield* Effect.forkChild(Effect.never)])
        for (const block of [yield* blockOf(Fiber.awaitAll(fibers)), yield* blockOf(Fiber.joinAll(fibers))]) {
          assert.isTrue(Array.isArray(block.blockedOn))
          assert.deepStrictEqual(block.members, Array.from(fibers))
        }
      }))

    it.effect("Fiber.awaitAll over a one-shot generator reports, and returns, every fiber", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const deferred = Deferred.makeUnsafe<number>()
        const first = yield* Effect.forkChild(Deferred.await(deferred), { startImmediately: true })
        const second = yield* Effect.forkChild(Deferred.await(deferred), { startImmediately: true })
        const fibers = (function*() {
          yield first
          yield second
        })()
        const waiter = yield* Effect.forkChild(Fiber.awaitAll(fibers), { startImmediately: true }).pipe(
          Effect.provideService(Supervisor.Supervisor, supervisor)
        )
        const block = events.find((event) => event._tag === "block" && event.fiber === waiter)
        assert.deepStrictEqual(block?._tag === "block" && block.members, [first, second])
        yield* Deferred.succeed(deferred, 1)
        assert.deepStrictEqual(yield* Fiber.join(waiter), [Exit.succeed(1), Exit.succeed(1)])
      }))

    it.effect("races report the Set of fibers they forked", () =>
      Effect.gen(function*() {
        const races = [
          Effect.race(Effect.never, Effect.never),
          Effect.raceAll([Effect.never, Effect.never]),
          Effect.raceFirst(Effect.never, Effect.never)
        ]
        for (const race of races) {
          const block = yield* blockOf(race)
          assert.instanceOf(block.blockedOn, Set)
          assert.strictEqual(block.members?.length, 2)
          assert.isTrue(block.members?.every((member) => Fiber.isFiber(member)))
        }
      }))

    it.effect("a concurrent forEach reports the Set of fibers it forked", () =>
      Effect.gen(function*() {
        const block = yield* blockOf(Effect.forEach([1, 2, 3], () => Effect.never, { concurrency: "unbounded" }))
        assert.instanceOf(block.blockedOn, Set)
        assert.strictEqual(block.members?.length, 3)
        assert.isTrue(block.members?.every((member) => Fiber.isFiber(member)))
      }))

    it.effect("RequestResolver.fromEffect reports the Set of fibers it forked", () =>
      Effect.gen(function*() {
        const { events, supervisor } = recorder()
        const resolver = RequestResolver.fromEffect<GetValue>(() => Effect.never)
        const fiber = yield* Effect.forkChild(
          Effect.all([
            Effect.request(new GetValue({ id: 1 }), resolver),
            Effect.request(new GetValue({ id: 2 }), resolver)
          ], {
            concurrency: "unbounded"
          }),
          { startImmediately: true }
        ).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        yield* Effect.yieldNow
        const sets = events.flatMap((event) => event._tag === "block" && event.blockedOn instanceof Set ? [event] : [])
        yield* Fiber.interrupt(fiber)
        const resolverBlock = sets.find((event) => event.fiber !== fiber)
        assert.strictEqual(resolverBlock?.members?.length, 2)
        assert.isTrue(resolverBlock?.members?.every((member) => Fiber.isFiber(member)))
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

    it.effect("Effect.never reports itself", () =>
      Effect.gen(function*() {
        assert.strictEqual((yield* blockOf(Effect.never)).blockedOn, Effect.never)
      }))

    it.effect("external waits report undefined", () =>
      Effect.gen(function*() {
        assert.isUndefined((yield* blockOf(Effect.callback<void>(() => {}))).blockedOn)
        assert.isUndefined((yield* blockOf(Effect.promise(() => new Promise<void>(() => {})))).blockedOn)
        assert.isUndefined((yield* blockOf(TestClock.withLive(Effect.sleep("1 hour")))).blockedOn)
      }))
  })

  describe("installation and composition", () => {
    const logging = (log: Array<string>, name: string): Supervisor.Supervisor => ({
      onStart: () => log.push(`${name} start`),
      onEnd: () => log.push(`${name} end`),
      onBlock: () => log.push(`${name} block`),
      onUnblock: () => log.push(`${name} unblock`)
    })

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

    it("combine removes Supervisors already in the chain", () => {
      const a = recorder().supervisor
      const b = recorder().supervisor
      const ab = Supervisor.combine(a, b)
      assert.strictEqual(Supervisor.combine(a, a), a)
      assert.strictEqual(Supervisor.combine(ab, b), ab)
      assert.strictEqual(Supervisor.combine(ab, a), ab)
      assert.strictEqual(Supervisor.combine(b)(ab), ab)
    })

    it.effect("Supervisor.layer adds to the Supervisor in place", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        yield* Effect.forkChild(Effect.void).pipe(
          Effect.andThen(Effect.yieldNow),
          Effect.provide(Supervisor.layer(logging(log, "b"))),
          Effect.provideService(Supervisor.Supervisor, logging(log, "a"))
        )
        assert.deepStrictEqual(log, ["a start", "b start", "a end", "b end"])
      }))

    it.effect("Supervisor.layer of the Supervisor in place reports each fiber once", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        const a = logging(log, "a")
        yield* Effect.forkChild(Effect.void).pipe(
          Effect.andThen(Effect.yieldNow),
          Effect.provide(Supervisor.layer(a)),
          Effect.provideService(Supervisor.Supervisor, a)
        )
        assert.deepStrictEqual(log, ["a start", "a end"])
      }))

    it.effect("a raw provideService replaces the Supervisor in place", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        yield* Effect.forkChild(Effect.void).pipe(
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

    it("Supervisor.layer under an unbuilt ManagedRuntime observes forks, not the root fiber", async () => {
      const { events, supervisor } = recorder()
      const runtime = ManagedRuntime.make(Supervisor.layer(supervisor))
      const root = runtime.runFork(Effect.forkChild(Effect.void))
      const child = await Effect.runPromise(Fiber.join(root))
      const started = events.flatMap((event) => event._tag === "start" ? [event.fiber] : [])
      assert.deepStrictEqual(started, [child])
      await runtime.dispose()
    })
  })
})
