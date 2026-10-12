// The coordinator <-> executor protocol. Everything that crosses a
// process/thread boundary is defined here as Schema, so the same RpcGroup can be
// served over worker threads, child processes or a socket.
import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"
import * as Schema from "effect/Schema"

const opt = Schema.optionalKey

export const Location = Schema.Struct({
  file: Schema.String,
  line: Schema.Number,
  column: Schema.Number
})
export type Location = typeof Location.Type

export const FailureKind = Schema.Literals([
  "assertion",
  "typedError",
  "defect",
  "timeout",
  "interrupted",
  "discardedEffect",
  "fixture",
  "load"
])
export type FailureKind = typeof FailureKind.Type

export const Failure = Schema.Struct({
  kind: FailureKind,
  message: Schema.String,
  errorTag: opt(Schema.String),
  errorFields: opt(Schema.String),
  location: opt(Location)
})
export type Failure = typeof Failure.Type

export const Status = Schema.Literals(["passed", "failed", "skipped", "timedOut", "interrupted"])
export type Status = typeof Status.Type

export const PlannedTest = Schema.Struct({
  id: Schema.String,
  file: Schema.String,
  tags: Schema.Array(Schema.String),
  timeoutMs: Schema.Number,
  retries: Schema.Number,
  seed: Schema.Number,
  skip: opt(Schema.String)
})
export type PlannedTest = typeof PlannedTest.Type

/** What a run selected, and how. */
export const Selection = Schema.Struct({
  /** the paths searched, as given (empty: the working directory) */
  paths: Schema.Array(Schema.String),
  /** test files found under them */
  files: Schema.Number,
  /** tests defined in those files */
  tests: Schema.Number,
  /** what narrowed the selection, e.g. `--test "x"` or `--failed (11 recorded)` */
  filters: Schema.Array(Schema.String)
})
export type Selection = typeof Selection.Type

/** The version of the event stream (`--reporter jsonl`), bumped on incompatible changes. See EVENTS.md. */
export const schemaVersion = 1

export const RunPlanned = Schema.TaggedStruct("RunPlanned", {
  schemaVersion: Schema.Literal(schemaVersion),
  runSeed: Schema.Number,
  selection: Selection,
  tests: Schema.Array(PlannedTest)
})
export const TestStarted = Schema.TaggedStruct("TestStarted", {
  id: Schema.String,
  attempt: Schema.Number
})
export const TestFinished = Schema.TaggedStruct("TestFinished", {
  id: Schema.String,
  status: Status,
  durationMs: Schema.Number,
  seed: Schema.Number,
  attempt: Schema.Number,
  /** failures of earlier attempts, when a retry eventually passed (flaky) */
  previousAttempts: Schema.Array(Schema.Struct({ attempt: Schema.Number, status: Status })),
  failures: Schema.Array(Failure),
  console: Schema.Array(Schema.String),
  skipReason: opt(Schema.String)
})
export type TestFinished = typeof TestFinished.Type
export const RunFinished = Schema.TaggedStruct("RunFinished", {
  passed: Schema.Number,
  failed: Schema.Number,
  skipped: Schema.Number,
  timedOut: Schema.Number,
  interrupted: Schema.Number,
  total: Schema.Number,
  durationMs: Schema.Number,
  bailed: Schema.Boolean,
  cancelled: Schema.Boolean
})
export type RunFinished = typeof RunFinished.Type

export const TestEvent = Schema.Union([RunPlanned, TestStarted, TestFinished, RunFinished])
export type TestEvent = typeof TestEvent.Type

// --- listing: the inspectable tree, flattened (parent links) so it is trivially JSON-safe

export const FixtureInfo = Schema.Struct({
  name: Schema.String
})
export type FixtureInfo = typeof FixtureInfo.Type

export const ListedNode = Schema.Struct({
  id: Schema.String,
  parent: opt(Schema.String),
  kind: Schema.Literals(["suite", "test"]),
  name: Schema.String,
  timeoutMs: opt(Schema.Number),
  retries: opt(Schema.Number),
  tags: Schema.Array(Schema.String),
  skip: opt(Schema.String),
  only: opt(Schema.Boolean),
  fixtures: Schema.Array(FixtureInfo),
  location: opt(Schema.String)
})
export type ListedNode = typeof ListedNode.Type

export class LoadError extends Schema.TaggedError<LoadError>()("LoadError", {
  path: Schema.String,
  message: Schema.String
}) {}

export const RunFileTest = Schema.Struct({
  id: Schema.String,
  seed: Schema.Number,
  timeoutMs: Schema.Number,
  retries: Schema.Number
})
export type RunFileTest = typeof RunFileTest.Type

export class ExecutorRpcs extends RpcGroup.make(
  Rpc.make("ListFile", {
    payload: { path: Schema.String },
    success: Schema.Struct({ file: Schema.String, nodes: Schema.Array(ListedNode) }),
    error: LoadError
  }),
  Rpc.make("RunFile", {
    payload: {
      path: Schema.String,
      /** absolute path of the test config, if the run uses one */
      config: opt(Schema.String),
      /** max concurrent tests (fibers) within this file */
      concurrency: Schema.Number,
      tests: Schema.Array(RunFileTest)
    },
    success: Schema.Union([TestStarted, TestFinished]),
    error: LoadError,
    stream: true
  })
) {}
