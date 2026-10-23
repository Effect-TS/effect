import * as Effect from "../../Effect.ts"
import type * as Result from "../../Result.ts"
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

const invoke = <A>(
  caller: E.Caller,
  operation: string,
  targets: ReadonlyArray<M.Target | M.DirectorySelector> | (() => ReadonlyArray<M.Target | M.DirectorySelector>),
  snapshot: (work: R.Work) => (tx: E.Transaction) => A
): Result.Result<A, M.OperationError> =>
  R.result(() =>
    caller.runtime.sync(caller.resource, operation, (work) => {
      const supplied = typeof targets === "function" ? targets() : targets
      work.reserve(
        supplied.reduce(
          (total, target) => total + E.addressBytes(target, operation, caller.runtime.limits),
          zero
        )
      )
      const body = snapshot(work)
      const tx = new E.Transaction(caller, work)
      return tx.transition(body(tx))
    })
  )

const simple = <Target extends M.Target, Value>(
  caller: E.Caller,
  operation: string,
  target: Target,
  body: (tx: E.Transaction, target: E.TargetSnapshot<Target>) => Value
): Result.Result<Value, M.OperationError> =>
  invoke(caller, operation, [target], () => {
    const selected = E.snapshotTarget(target)
    return (tx) => body(tx, selected)
  })

const withOptions = <Target extends M.Target, Operation extends A.Operation, Value>(
  caller: E.Caller,
  operation: Operation,
  target: Target,
  options: A.OptionsByOperation[Operation],
  body: (tx: E.Transaction, target: E.TargetSnapshot<Target>, options: A.OptionsByOperation[Operation]) => Value
): Result.Result<Value, M.OperationError> =>
  invoke(caller, operation, [target], () => {
    A.validate(operation, options)
    const fixed = P.snapshotOptions[operation](options)
    const selected = E.snapshotTarget(target)
    return (tx) => body(tx, selected, fixed)
  })

// -----------------------------------------------------------------------------
// Caller construction
// -----------------------------------------------------------------------------

const make = (caller: E.Caller): M.SyncFileSystem =>
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
      invoke(caller, "writeFile", [target], (work) => {
        A.validate("writeFile", options)
        const data = P.snapshotInput(work, input)
        const selected = E.snapshotTarget(target)
        const fixed = P.snapshotOptions.writeFile(options)
        return (tx) => A.writeFile(tx, selected, data, fixed)
      }),
    truncate: (target, length, options) =>
      invoke(caller, "truncate", [target], () => {
        A.validate("truncate", options)
        const amount = R.size(length, "truncate", "length")
        const selected = E.snapshotTarget(target)
        const fixed = P.snapshotOptions.truncate(options)
        return (tx) => A.truncate(tx, selected, amount, fixed)
      }),
    setAttributes: (target, attributes, options) =>
      invoke(caller, "setAttributes", [target], () => {
        A.validate("setAttributes", options)
        A.validateAttributes(attributes, "setAttributes")
        const selected = E.snapshotTarget(target)
        const fixed = P.snapshotOptions.setAttributes(options)
        const attrs = P.snapshotAttributes(attributes, "setAttributes")
        return (tx) => A.setAttributes(tx, selected, attrs, fixed)
      }),
    createFile: (target, options) => withOptions(caller, "createFile", target, options, A.createFile),
    makeDirectory: (target, options) => withOptions(caller, "makeDirectory", target, options, A.makeDirectory),
    makeSymlink: (target, link, options) =>
      invoke(caller, "makeSymlink", [target, link], () => {
        A.validate("makeSymlink", options)
        const selected = E.snapshotTarget(target)
        const bytes = E.pathValue(link, "makeSymlink")
        const fixed = P.snapshotOptions.makeSymlink(options)
        return (tx) => A.makeSymlink(tx, selected, bytes, fixed)
      }),
    makeHardLink: (source, target, options) =>
      invoke(caller, "makeHardLink", () => {
        if (source === null || typeof source !== "object") return R.invalid("makeHardLink", "source")
        E.checkOptions(source, "reference" in source ? ["reference"] : ["entry", "conditions"], "makeHardLink")
        return ["reference" in source ? source.reference : source.entry, target]
      }, () => {
        A.validate("makeHardLink", options)
        const selected = E.snapshotTarget(target)
        const fixed = P.snapshotOptions.makeHardLink(options)
        const input = P.snapshotHardLinkSource(source)
        return (tx) => A.makeHardLink(tx, input, selected, fixed)
      }),
    rename: (source, target, options) =>
      invoke(caller, "rename", [source, target], () => {
        A.validate("rename", options)
        const from = E.snapshotTarget(source)
        const to = E.snapshotTarget(target)
        const fixed = P.snapshotOptions.rename(options)
        return (tx) => A.rename(tx, from, to, fixed)
      }),
    unlink: (target, options) => withOptions(caller, "unlink", target, options, A.unlink),
    removeDirectory: (target, options) => withOptions(caller, "removeDirectory", target, options, A.removeDirectory),
    open: (target: M.Target, options?: M.OpenOptions) => H.openSync(caller, caller.resource, target, options),
    openDirectory: (target) => H.openDirectorySync(caller, caller.resource, target)
  })

// -----------------------------------------------------------------------------
// Scoped acquisition
// -----------------------------------------------------------------------------

export const acquireSync = Effect.fnUntraced(
  function*(source: E.Caller): Effect.fn.Return<M.SyncFileSystem, M.OperationError, Scope.Scope> {
    const scope = yield* Scope.Scope
    const runtime = source.runtime
    const engine = yield* R.evaluate(() => {
      if (runtime.inTurn) throw new M.ReentrantOperation({ operation: "acquireSync", reason: "sameInstance" })
      if (source.resource.state !== "open") throw R.closed("acquireSync", source.resource.state)
      if (!runtime.limits.synchronous) {
        throw new M.CapabilityUnavailable({ operation: "acquireSync", reason: "syncDisabled" })
      }
      return E.resolveEngine(source)
    })
    return yield* runtime.acquireScopedResource("region", "acquireSync", scope, (resource) => {
      engine.retain(source.policy, resource)
      return make(E.createCaller(engine, source.policy, resource))
    })
  },
  Effect.uninterruptible
)
