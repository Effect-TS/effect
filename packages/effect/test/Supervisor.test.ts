import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Fiber, Supervisor, TxRef } from "effect"

type Event =
  | { readonly _tag: "start"; readonly fiber: Fiber.Fiber<unknown, unknown>; readonly parent: unknown }
  | { readonly _tag: "end"; readonly fiber: Fiber.Fiber<unknown, unknown> }
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
    onEnd: (fiber) => events.push({ _tag: "end", fiber }),
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
        const [child, root] = yield* Effect.gen(function*() {
          const child = yield* Effect.forkChild(Effect.void)
          yield* mark("forker continues")
          const root = Effect.runForkWith(Context.make(Supervisor.Supervisor, supervisor))(Effect.void)
          return [child, root] as const
        }).pipe(Effect.provideService(Supervisor.Supervisor, supervisor))
        assert.deepStrictEqual(events.filter((event) => event._tag === "start" || event._tag === "mark"), [
          { _tag: "start", fiber: child, parent: forker },
          { _tag: "mark", label: "forker continues" },
          { _tag: "start", fiber: root, parent: undefined }
        ])
      }))

    it.effect("a blocked fiber unblocks when its wait completes or it is interrupted", () =>
      Effect.gen(function*() {
        const { supervisor, tagsOf } = recorder()
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
      }))

    it.effect("a fiber keeps its first Supervisor when its context changes, and its forks take the new one", () =>
      Effect.gen(function*() {
        const first = recorder()
        const second = recorder()
        const outer = yield* Effect.forkChild(Effect.void).pipe(
          Effect.provideService(Supervisor.Supervisor, second.supervisor),
          Effect.forkChild,
          Effect.provideService(Supervisor.Supervisor, first.supervisor)
        )
        const inner = yield* Fiber.join(outer)
        yield* Fiber.await(inner)
        assert.deepStrictEqual(first.tagsOf(outer), ["start", "end"])
        assert.deepStrictEqual(second.tagsOf(outer), [])
        assert.deepStrictEqual(second.tagsOf(inner), ["start", "end"])
        assert.deepStrictEqual(first.tagsOf(inner), [])
      }))
  })

  describe("blocked on", () => {
    it.effect("a Deferred wait reports the Deferred", () =>
      Effect.gen(function*() {
        const deferred = Deferred.makeUnsafe<void>()
        assert.strictEqual((yield* blockOf(Deferred.await(deferred))).blockedOn, deferred)
      }))

    it.effect("a race reports the Set of fibers it forked", () =>
      Effect.gen(function*() {
        const block = yield* blockOf(Effect.race(Effect.never, Effect.never))
        assert.instanceOf(block.blockedOn, Set)
        assert.strictEqual(block.members?.length, 2)
        assert.isTrue(block.members?.every((member) => Fiber.isFiber(member)))
      }))

    it.effect("a transaction that retries reports the TxRefs it read", () =>
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

    it.effect("Effect.callback reports its blockedOn option, or undefined without one", () =>
      Effect.gen(function*() {
        const blockedOn = {}
        let signal: AbortSignal | undefined
        const withOption = Effect.callback<void>((_resume, signal_) => {
          signal = signal_
        }, { blockedOn })
        assert.strictEqual((yield* blockOf(withOption)).blockedOn, blockedOn)
        assert.isTrue(signal?.aborted)
        assert.isUndefined((yield* blockOf(Effect.callback<void>(() => {}))).blockedOn)
      }))
  })

  describe("installation and composition", () => {
    it.effect("combine calls each Supervisor once, outer first, even when the combinations overlap", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        const a = logging(log, "a")
        const b = logging(log, "b")
        const c = logging(log, "c")
        const ab = Supervisor.combine(a, b)
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
  })
})
