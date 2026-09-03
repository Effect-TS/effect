import { assert, beforeAll, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Layer, Queue, Result, type Scope, Stream } from "effect"
import * as EventJournal from "effect/unstable/eventlog/EventJournal"
import * as EventLog from "effect/unstable/eventlog/EventLog"
import * as EventLogEncryption from "effect/unstable/eventlog/EventLogEncryption"
import * as EventLogMessage from "effect/unstable/eventlog/EventLogMessage"
import * as EventLogRemote from "effect/unstable/eventlog/EventLogRemote"
import * as EventLogServerEncrypted from "effect/unstable/eventlog/EventLogServerEncrypted"
import type * as Rpc from "effect/unstable/rpc/Rpc"
import type * as RpcGroup from "effect/unstable/rpc/RpcGroup"
import * as RpcTest from "effect/unstable/rpc/RpcTest"

// Exactly two fresh, process-local identities; no saved keys or configuration.
let identityA: EventLog.Identity["Service"]
let identityB: EventLog.Identity["Service"]
beforeAll(async () => {
  ;[identityA, identityB] = await Effect.runPromise(
    Effect.gen(function*() {
      return [yield* EventLog.makeIdentity, yield* EventLog.makeIdentity] as const
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle))
  )
})

const storeId = EventLogMessage.StoreId.make("retry-verification")
const remoteId = EventJournal.makeRemoteIdUnsafe()
const helloResponse = new EventLogMessage.HelloResponse({ remoteId, challenge: new Uint8Array(16).fill(1) })
const makeEntry = (value = 1, id = EventJournal.makeEntryIdUnsafe()) =>
  new EventJournal.Entry({ id, event: "RetryFixture", primaryKey: "fixture", payload: new Uint8Array([value]) })
const requestFor = (identity = identityA, entry = makeEntry()) => ({ identity, storeId, entries: [entry] })
const protocolError = (position: "Authenticate" | "WriteSingle", code: EventLogMessage.EventLogProtocolError["code"]) =>
  new EventLogMessage.EventLogProtocolError({
    requestTag: position,
    publicKey: undefined,
    code,
    message: "local fixture"
  })
const audit = (id: string, data: Record<string, unknown>) => console.log(JSON.stringify({ caseId: id, ...data }))

const failure = <A>(exit: Exit.Exit<A, EventLogRemote.EventLogRemoteError>) => {
  assert(Exit.isFailure(exit))
  return Result.getOrThrow(Cause.findError(exit.cause))
}
const assertWrapped = <A>(
  exit: Exit.Exit<A, EventLogRemote.EventLogRemoteError>,
  expected: unknown,
  position: "Authenticate" | "WriteSingle"
) => {
  const outer = failure(exit)
  assert.strictEqual(outer.method, "write")
  if (position === "Authenticate") {
    assert(outer.cause instanceof EventLogRemote.EventLogRemoteError)
    assert.strictEqual(outer.cause.method, "authenticate")
    assert.strictEqual(outer.cause.cause, expected)
  } else {
    assert.strictEqual(outer.cause, expected)
  }
}

type Rpcs = RpcGroup.Rpcs<typeof EventLogMessage.EventLogRemoteRpcs>
type Request = {
  readonly _tag: Rpc.Tag<Rpcs>
  readonly request: Rpc.Payload<Rpcs>
  readonly resume: (response: Effect.Effect<unknown, unknown>) => void
}
type MakeRemote = Effect.Effect<
  EventLogRemote.EventLogRemote["Service"],
  EventLogRemote.EventLogRemoteError,
  Scope.Scope | EventLogRemote.EventLogRemoteClient | EventLog.Registry | EventLogEncryption.EventLogEncryption
>

// The same request/resume boundary as EventLogRemote.test.ts. All RPCs still
// pass through RpcTest; only the handlers' responses are controlled.
const makeHarness = Effect.fn(function*(makeRemote: MakeRemote) {
  const requests = yield* Queue.make<Request>()
  const counts = { hello: 0, authenticate: 0, write: 0, changes: 0 }
  const handle = (tag: Rpc.Tag<Rpcs>) => <A, E>(request: any) =>
    Effect.callback<A, E>((resume) => {
      if (tag === "EventLog.Hello") counts.hello++
      if (tag === "EventLog.Authenticate") counts.authenticate++
      if (tag === "EventLog.WriteSingle") counts.write++
      if (tag === "EventLog.Changes") counts.changes++
      Queue.offerUnsafe(requests, { _tag: tag, request, resume: resume as Request["resume"] })
    })
  const client = yield* RpcTest.makeClient(EventLogMessage.EventLogRemoteRpcs).pipe(
    Effect.provide(EventLogMessage.EventLogRemoteRpcs.toLayer({
      "EventLog.Hello": handle("EventLog.Hello"),
      "EventLog.Authenticate": handle("EventLog.Authenticate"),
      "EventLog.WriteSingle": handle("EventLog.WriteSingle"),
      "EventLog.WriteChunked": handle("EventLog.WriteChunked"),
      "EventLog.Changes": handle("EventLog.Changes")
    })),
    Effect.provideService(
      EventLogMessage.EventLogAuthentication,
      (effect) => Effect.provideService(effect, EventLog.Identity, identityA)
    )
  )
  const remoteFiber = yield* makeRemote.pipe(
    Effect.provideService(EventLogRemote.EventLogRemoteClient, client),
    Effect.provide([EventLog.layerRegistry, EventLogEncryption.layerSubtle]),
    Effect.forkScoped
  )
  const hello = yield* Queue.take(requests)
  assert.strictEqual(hello._tag, "EventLog.Hello")
  hello.resume(Effect.succeed(helloResponse))
  return { remote: yield* Fiber.join(remoteFiber), take: Queue.take(requests), counts }
})

const respond = Effect.fn(function*(
  harness: Effect.Success<ReturnType<typeof makeHarness>>,
  response: (request: Request) => Effect.Effect<unknown, unknown>
) {
  yield* Effect.forever(Effect.gen(function*() {
    const request = yield* harness.take
    request.resume(response(request))
  })).pipe(Effect.forkScoped)
})

describe("EventLogRemote forbidden retry verification", () => {
  it.effect("R2-real-encrypted-two-identities", () =>
    Effect.gen(function*() {
      const storage = yield* EventLogServerEncrypted.makeStorageMemory
      const receipts: Array<{ identity: string; added: number }> = []
      const observedStorage = EventLogServerEncrypted.Storage.of({
        ...storage,
        write: (key, store, entries) =>
          storage.write(key, store, entries).pipe(Effect.tap((added) =>
            Effect.sync(() => {
              receipts.push({ identity: key === identityA.publicKey ? "A" : "B", added: added.length })
            })
          ))
      })
      const client = yield* RpcTest.makeClient(EventLogMessage.EventLogRemoteRpcs).pipe(
        Effect.provide(EventLogServerEncrypted.layerRpcHandlers.pipe(
          Layer.provide(Layer.succeed(EventLogServerEncrypted.Storage, observedStorage))
        ))
      )
      const counts = { hello: 0, authA: 0, authB: 0, forbidden: 0 }
      const observed = EventLogRemote.EventLogRemoteClient.of({
        ...client,
        "EventLog.Hello": (request, options) =>
          Effect.suspend(() => {
            counts.hello++
            return client["EventLog.Hello"](request, options)
          }),
        "EventLog.Authenticate": (request, options) =>
          Effect.suspend(() => {
            if (request.publicKey === identityA.publicKey) counts.authA++
            else counts.authB++
            return client["EventLog.Authenticate"](request, options).pipe(Effect.tapError((error) =>
              Effect.sync(() => {
                assert(error instanceof EventLogMessage.EventLogProtocolError)
                assert.strictEqual(error.code, "Forbidden")
                assert.strictEqual(error.message, "Session auth challenge has expired")
                counts.forbidden++
              })
            ))
          })
      })
      const remote = yield* EventLogRemote.makeEncrypted.pipe(
        Effect.provideService(EventLogRemote.EventLogRemoteClient, observed),
        Effect.provide(EventLog.layerRegistry)
      )
      const encryption = yield* EventLogEncryption.EventLogEncryption
      const readEntries = Effect.fn(function*(identity: EventLog.Identity["Service"]) {
        // First stream chunk is the complete nonempty journal snapshot, not a
        // truncated take(N) that could hide duplicate rows.
        const chunks = yield* storage.changes(identity.publicKey, storeId, 0).pipe(
          Stream.chunks,
          Stream.take(1),
          Stream.runCollect
        )
        return yield* encryption.decrypt(identity, chunks[0])
      })
      const entryA = makeEntry(11)
      // Same id in distinct identity journals proves identity-scoped deduplication.
      const entryB = makeEntry(22, entryA.id)
      yield* remote.write(requestFor(identityA, entryA))
      const firstB = yield* Effect.exit(remote.write(requestFor(identityB, entryB)))
      const firstBCounts = { ...counts }
      if (Exit.isFailure(firstB)) {
        const error = failure(firstB)
        assert.strictEqual(error.method, "write")
        assert(error.cause instanceof EventLogRemote.EventLogRemoteError)
        assert.strictEqual(error.cause.method, "authenticate")
        assert(error.cause.cause instanceof EventLogMessage.EventLogProtocolError)
        assert.strictEqual(error.cause.cause.code, "Forbidden")
        assert.strictEqual(error.cause.cause.message, "Session auth challenge has expired")
        assert.deepStrictEqual(receipts, [{ identity: "A", added: 1 }])
      } else {
        const entries = yield* readEntries(identityB)
        assert.strictEqual(entries.length, 1)
        assert.strictEqual(entries[0].entry.idString, entryB.idString)
        assert.deepStrictEqual(Array.from(entries[0].entry.payload), [22])
        assert.deepStrictEqual(receipts, [{ identity: "A", added: 1 }, { identity: "B", added: 1 }])
      }
      const manualB = yield* Effect.exit(remote.write(requestFor(identityB, entryB)))
      assert.isTrue(Exit.isSuccess(manualB))
      assert.strictEqual(receipts.at(-1)?.added, Exit.isSuccess(firstB) ? 0 : 1)
      yield* remote.write(requestFor(identityB, entryB))
      assert.strictEqual(receipts.at(-1)?.added, 0)
      const markerA = makeEntry(33)
      const markerB = makeEntry(44)
      yield* remote.write(requestFor(identityA, markerA))
      yield* remote.write(requestFor(identityB, markerB))
      for (const [identity, expected] of [[identityA, [entryA, markerA]], [identityB, [entryB, markerB]]] as const) {
        const entries = yield* readEntries(identity)
        assert.deepStrictEqual(entries.map((entry) => entry.remoteSequence), [0, 1])
        assert.deepStrictEqual(entries.map((entry) => entry.entry.idString), expected.map((entry) => entry.idString))
        assert.deepStrictEqual(
          entries.map((entry) => Array.from(entry.entry.payload)),
          expected.map((entry) => Array.from(entry.payload))
        )
      }
      assert.deepStrictEqual(counts, { hello: 2, authA: 1, authB: 2, forbidden: 1 })
      assert.strictEqual(receipts.reduce((n, entry) => n + entry.added, 0), 4)
      audit("R2-real-encrypted-two-identities", {
        firstB: firstB._tag,
        manualB: manualB._tag,
        firstBCounts,
        counts,
        receipts,
        rowsA: 2,
        rowsB: 2
      })
      assert.isTrue(Exit.isSuccess(firstB), "first B write must reauthenticate automatically")
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))

  for (
    const [mode, makeRemote] of [["encrypted", EventLogRemote.makeEncrypted], [
      "unencrypted",
      EventLogRemote.makeUnencrypted
    ]] as const
  ) {
    for (const position of ["Authenticate", "WriteSingle"] as const) {
      const id = `R2-transient-${mode}-${position}`
      it.effect(id, () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(makeRemote)
          const error = protocolError(position, "Forbidden")
          let injected = false
          yield* respond(harness, (request) => {
            if (request._tag === "EventLog.Hello") return Effect.succeed(helloResponse)
            if (request._tag === `EventLog.${position}` && !injected) {
              injected = true
              return Effect.fail(error)
            }
            return Effect.void
          })
          const exit = yield* Effect.exit(harness.remote.write(requestFor()))
          audit(id, { outcome: exit._tag, counts: harness.counts })
          if (Exit.isFailure(exit)) assertWrapped(exit, error, position)
          assert.isTrue(Exit.isSuccess(exit))
          assert.deepStrictEqual(harness.counts, {
            hello: 2,
            authenticate: 2,
            write: position === "Authenticate" ? 1 : 2,
            changes: 0
          })
        }))
    }
  }

  for (const position of ["Authenticate", "WriteSingle"] as const) {
    for (const code of ["Unauthorized", "NotFound", "InvalidRequest", "InternalServerError", "Forbidden"] as const) {
      const id = `R2-persistent-${position}-${code}`
      it.effect(id, () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(EventLogRemote.makeEncrypted)
          const error = protocolError(position, code)
          yield* respond(harness, (request) => {
            if (request._tag === "EventLog.Hello") return Effect.succeed(helloResponse)
            if (harness.counts.authenticate > 6 || harness.counts.write > 6) return Effect.die("retry bound exceeded")
            return request._tag === `EventLog.${position}` ? Effect.fail(error) : Effect.void
          })
          const exit = yield* Effect.exit(harness.remote.write(requestFor()))
          assertWrapped(exit, error, position)
          audit(id, { outcome: exit._tag, counts: harness.counts })
          const attempts = code === "Forbidden" ? 6 : 1
          assert.deepStrictEqual(harness.counts, {
            hello: attempts,
            authenticate: attempts,
            write: position === "Authenticate" ? 0 : attempts,
            changes: 0
          })
        }))
    }

    it.effect(`R2-defect-${position}`, () =>
      Effect.gen(function*() {
        const harness = yield* makeHarness(EventLogRemote.makeEncrypted)
        // A Forbidden-shaped defect must not be mistaken for a retryable failure.
        const defect = protocolError(position, "Forbidden")
        yield* respond(harness, (request) =>
          request._tag === "EventLog.Hello"
            ? Effect.succeed(helloResponse)
            : request._tag === `EventLog.${position}`
            ? Effect.die(defect)
            : Effect.void)
        const exit = yield* Effect.exit(harness.remote.write(requestFor()))
        assert(Exit.isFailure(exit))
        assert.isFalse(Cause.hasFails(exit.cause))
        assert.strictEqual(Result.getOrThrow(Cause.findDefect(exit.cause)), defect)
        assert.deepStrictEqual(harness.counts, {
          hello: 1,
          authenticate: 1,
          write: position === "Authenticate" ? 0 : 1,
          changes: 0
        })
        audit(`R2-defect-${position}`, { counts: harness.counts, typedFailures: 0, defects: 1 })
      }))

    it.effect(`R2-interruption-${position}`, () =>
      Effect.gen(function*() {
        const harness = yield* makeHarness(EventLogRemote.makeEncrypted)
        const fiber = yield* harness.remote.write(requestFor()).pipe(Effect.forkScoped)
        const auth = yield* harness.take
        assert.strictEqual(auth._tag, "EventLog.Authenticate")
        if (position === "WriteSingle") {
          auth.resume(Effect.void)
          const write = yield* harness.take
          assert.strictEqual(write._tag, "EventLog.WriteSingle")
        }
        yield* Fiber.interrupt(fiber)
        const exit = yield* Fiber.await(fiber)
        assert(Exit.isFailure(exit))
        assert.isTrue(Cause.hasInterruptsOnly(exit.cause))
        assert.deepStrictEqual(harness.counts, {
          hello: 1,
          authenticate: 1,
          write: position === "Authenticate" ? 0 : 1,
          changes: 0
        })
        audit(`R2-interruption-${position}`, { counts: harness.counts, interruptionOnly: true })
      }))
  }

  for (const method of ["hello", "authenticate"] as const) {
    it.effect(`R2-no-recursive-unwrapping-${method}`, () =>
      Effect.gen(function*() {
        const harness = yield* makeHarness(EventLogRemote.makeEncrypted)
        const error = new EventLogRemote.EventLogRemoteError({
          method,
          cause: protocolError("Authenticate", "Forbidden")
        })
        // Hello wrapper at write position, or a nested authenticate wrapper inside
        // the actual authenticate wrapper. Neither is a direct auth protocol cause.
        const position = method === "hello" ? "WriteSingle" : "Authenticate"
        yield* respond(harness, (request) =>
          request._tag === "EventLog.Hello"
            ? Effect.succeed(helloResponse)
            : request._tag === `EventLog.${position}`
            ? Effect.fail(error)
            : Effect.void)
        const exit = yield* Effect.exit(harness.remote.write(requestFor()))
        assertWrapped(exit, error, position)
        assert.deepStrictEqual(harness.counts, {
          hello: 1,
          authenticate: 1,
          write: position === "Authenticate" ? 0 : 1,
          changes: 0
        })
        audit(`R2-no-recursive-unwrapping-${method}`, { counts: harness.counts })
      }))
  }

  for (const code of ["Forbidden", "InternalServerError"] as const) {
    it.effect(`R2-changes-startup-${code}`, () =>
      Effect.gen(function*() {
        const harness = yield* makeHarness(EventLogRemote.makeUnencrypted)
        const error = protocolError("Authenticate", code)
        const entry = makeEntry(55)
        const data = yield* EventLogMessage.ChangesRpc.encodeUnencrypted([
          new EventJournal.RemoteEntry({ entry, remoteSequence: 0 })
        ])
        // An ordinary Queue with a finite response; no hand-crafted Queue internals.
        const incoming = yield* Queue.make<
          EventLogMessage.SingleMessage,
          EventLogMessage.EventLogProtocolError | Cause.Done
        >()
        yield* Queue.offer(incoming, new EventLogMessage.SingleMessage({ data }))
        yield* Queue.end(incoming)
        yield* respond(harness, (request) => {
          if (request._tag === "EventLog.Hello") return Effect.succeed(helloResponse)
          if (request._tag === "EventLog.Authenticate" && harness.counts.authenticate === 1) return Effect.fail(error)
          if (request._tag === "EventLog.Changes") return Effect.succeed(incoming)
          return Effect.void
        })
        const outgoing = yield* harness.remote.changes({ identity: identityA, storeId, startSequence: 0 })
        const first = yield* Effect.exit(Queue.take(outgoing))
        audit(`R2-changes-startup-${code}`, { outcome: first._tag, counts: harness.counts })
        if (code === "InternalServerError") {
          const wrapped = failure(first)
          assert.strictEqual(wrapped.method, "authenticate")
          assert.strictEqual(wrapped.cause, error)
          assert.deepStrictEqual(harness.counts, { hello: 1, authenticate: 1, write: 0, changes: 0 })
        } else {
          assert(Exit.isSuccess(first))
          assert.strictEqual(first.value.entry.idString, entry.idString)
          assert.deepStrictEqual(Array.from(first.value.entry.payload), [55])
          assert.strictEqual(first.value.remoteSequence, 0)
          assert.deepStrictEqual(harness.counts, { hello: 2, authenticate: 2, write: 0, changes: 1 })
        }
      }))
  }
})
