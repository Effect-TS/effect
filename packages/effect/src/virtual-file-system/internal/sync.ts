import * as Effect from "../../Effect.ts"
import * as Result from "../../Result.ts"
import * as Scope from "../../Scope.ts"
import * as A from "./atomic.ts"
import * as E from "./engine.ts"
import * as H from "./handles.ts"
import * as M from "./model.ts"
import * as P from "./preparation.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Transaction invocation
// -----------------------------------------------------------------------------

const zero = BigInt(0)

const invokeResult = <A>(
  caller: E.Caller,
  operation: string,
  targets:
    | ReadonlyArray<M.Target | M.DirectorySelector>
    | (() => Result.Result<ReadonlyArray<M.Target | M.DirectorySelector>, M.OperationError>),
  snapshot: (work: R.Work) => Result.Result<(tx: E.Transaction) => Result.Result<A, M.OperationError>, M.OperationError>
) =>
  caller.runtime.syncResult(caller.resource, operation, (work) =>
    Result.gen(function*() {
      const supplied = typeof targets === "function" ? yield* targets() : targets
      let bytes = zero
      for (const target of supplied) bytes += yield* E.addressBytesResult(target, operation, caller.runtime.limits)
      yield* work.reserveResult(bytes)
      const body = yield* snapshot(work)
      const tx = new E.Transaction(caller, work)
      const value = yield* body(tx)
      return yield* tx.transitionResult(value)
    }))

const simple = <Target extends M.Target, Value>(
  caller: E.Caller,
  operation: string,
  target: Target,
  body: (tx: E.Transaction, target: E.TargetSnapshot<Target>) => Result.Result<Value, M.OperationError>
) =>
  invokeResult(
    caller,
    operation,
    [target],
    () => Result.map(E.snapshotTargetResult(target), (selected) => (tx: E.Transaction) => body(tx, selected))
  )

const withOptions = <Target extends M.Target, Operation extends A.Operation, Value>(
  caller: E.Caller,
  operation: Operation,
  target: Target,
  options: A.OptionsByOperation[Operation],
  body: (
    tx: E.Transaction,
    target: E.TargetSnapshot<Target>,
    options: A.OptionsByOperation[Operation]
  ) => Result.Result<Value, M.OperationError>
) =>
  invokeResult(caller, operation, [target], () =>
    Result.gen(function*() {
      yield* A.validate(operation, options)
      const fixed = yield* P.snapshotOptions[operation](options)
      const selected = yield* E.snapshotTargetResult(target)
      return (tx: E.Transaction) => body(tx, selected, fixed)
    }))

// -----------------------------------------------------------------------------
// Caller construction
// -----------------------------------------------------------------------------

const make = (caller: E.Caller) =>
  Object.freeze<M.SyncFileSystem>({
    [M.SyncTypeId]: M.SyncTypeId,
    lookup: (target) => R.readOnlyResult(simple(caller, "lookup", target, A.lookup)),
    stat: (target) => R.readOnlyResult(simple(caller, "stat", target, A.stat)),
    linkStat: (target) => R.readOnlyResult(simple(caller, "linkStat", target, A.linkStat)),
    access: (target, options) => R.readOnlyResult(withOptions(caller, "access", target, options, A.access)),
    observeEntry: (target) => R.readOnlyResult(simple(caller, "observeEntry", target, A.observeEntry)),
    observeRouteParent: (target) =>
      R.readOnlyResult(simple(caller, "observeRouteParent", target, A.observeRouteParent)),
    realPath: (target) => R.readOnlyResult(simple(caller, "realPath", target, A.realPath)),
    readFile: (target) => R.readOnlyResult(simple(caller, "readFile", target, A.readFile)),
    readFileObserved: (target) => R.readOnlyResult(simple(caller, "readFileObserved", target, A.readFileObserved)),
    readLink: (target) => R.readOnlyResult(simple(caller, "readLink", target, A.readLink)),
    readLinkObserved: (target) => R.readOnlyResult(simple(caller, "readLinkObserved", target, A.readLinkObserved)),
    readDirectory: (target) => R.readOnlyResult(simple(caller, "readDirectory", target, A.readDirectory)),
    readDirectoryEntries: (target) =>
      R.readOnlyResult(simple(caller, "readDirectoryEntries", target, A.readDirectoryEntries)),
    writeFile: (target: M.Target, input: Uint8Array, options?: M.WriteFileOptions) =>
      invokeResult(caller, "writeFile", [target], (work) =>
        Result.gen(function*() {
          yield* A.validate("writeFile", options)
          const data = yield* P.snapshotInput(work, input)
          const selected = yield* E.snapshotTargetResult(target)
          const fixed = yield* P.snapshotOptions.writeFile(options)
          return (tx: E.Transaction) => A.writeFile(tx, selected, data, fixed)
        })),
    truncate: (target, length, options) =>
      invokeResult(caller, "truncate", [target], () =>
        Result.gen(function*() {
          yield* E.checkOptionsResult(options, A.optionFields.truncate, "truncate")
          const amount = yield* R.sizeResult(length, "truncate", "length")
          const selected = yield* E.snapshotTargetResult(target)
          const fixed = yield* P.snapshotTruncateOptions(options)
          return (tx: E.Transaction) => A.truncate(tx, selected, amount, fixed)
        })),
    setAttributes: (target, attributes, options) =>
      invokeResult(caller, "setAttributes", [target], () =>
        Result.gen(function*() {
          yield* A.validate("setAttributes", options)
          yield* A.validateAttributes(attributes, "setAttributes")
          const selected = yield* E.snapshotTargetResult(target)
          const fixed = yield* P.snapshotOptions.setAttributes(options)
          const attrs = yield* P.snapshotAttributes(attributes, "setAttributes")
          return (tx: E.Transaction) => A.setAttributes(tx, selected, attrs, fixed)
        })),
    createFile: (target, options) => withOptions(caller, "createFile", target, options, A.createFile),
    makeDirectory: (target, options) => withOptions(caller, "makeDirectory", target, options, A.makeDirectory),
    makeSymlink: (target, link, options) =>
      invokeResult(caller, "makeSymlink", [target, link], () =>
        Result.gen(function*() {
          yield* A.validate("makeSymlink", options)
          const selected = yield* E.snapshotTargetResult(target)
          const bytes = yield* E.pathValueResult(link, "makeSymlink")
          const fixed = yield* P.snapshotOptions.makeSymlink(options)
          return (tx: E.Transaction) => A.makeSymlink(tx, selected, bytes, fixed)
        })),
    makeHardLink: (source, target, options) =>
      invokeResult(caller, "makeHardLink", () =>
        Result.gen(function*() {
          if (source === null || typeof source !== "object") {
            return yield* Result.fail(
              new M.InvalidInput({ operation: "makeHardLink", field: "source", reason: "malformed" })
            )
          }
          yield* E.checkOptionsResult(
            source,
            "reference" in source ? ["reference"] : ["entry", "conditions"],
            "makeHardLink"
          )
          return ["reference" in source ? source.reference : source.entry, target]
        }), () =>
        Result.gen(function*() {
          yield* A.validate("makeHardLink", options)
          const selected = yield* E.snapshotTargetResult(target)
          const fixed = yield* P.snapshotOptions.makeHardLink(options)
          const input = yield* P.snapshotHardLinkSource(source)
          return (tx: E.Transaction) => A.makeHardLink(tx, input, selected, fixed)
        })),
    rename: (source, target, options) =>
      invokeResult(caller, "rename", [source, target], () =>
        Result.gen(function*() {
          yield* A.validate("rename", options)
          const from = yield* E.snapshotTargetResult(source)
          const to = yield* E.snapshotTargetResult(target)
          const fixed = yield* P.snapshotOptions.rename(options)
          return (tx: E.Transaction) => A.rename(tx, from, to, fixed)
        })),
    unlink: (target, options) => withOptions(caller, "unlink", target, options, A.unlink),
    removeDirectory: (target, options) => withOptions(caller, "removeDirectory", target, options, A.removeDirectory),
    open: (target: M.Target, options?: M.OpenOptions) => H.openSync(caller, caller.resource, target, options),
    openDirectory: (target) => H.openDirectorySync(caller, caller.resource, target)
  })

// -----------------------------------------------------------------------------
// Scoped acquisition
// -----------------------------------------------------------------------------

export const acquireSync = Effect.fnUntraced(
  function*(source: E.Caller) {
    const scope = yield* Scope.Scope
    const runtime = source.runtime
    const engine = yield* Effect.suspend(() =>
      Effect.fromResult(Result.gen(function*() {
        if (runtime.inTurn) {
          return yield* Result.fail(new M.ReentrantOperation({ operation: "acquireSync", reason: "sameInstance" }))
        }
        yield* source.resource.checkOpenResult("acquireSync")
        if (!runtime.limits.synchronous) {
          return yield* Result.fail(new M.CapabilityUnavailable({ operation: "acquireSync", reason: "syncDisabled" }))
        }
        return E.resolveEngine(source)
      }))
    )
    return yield* runtime.acquireScopedResourceResult(
      "region",
      "acquireSync",
      scope,
      (resource) =>
        Result.gen(function*() {
          yield* engine.retainResult(source.policy, resource)
          return make(yield* E.createCallerResult(engine, source.policy, resource))
        })
    )
  },
  Effect.uninterruptible
)
