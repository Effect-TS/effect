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
  "noAssertions",
  "load"
])
export type FailureKind = typeof FailureKind.Type

/** One reason an assertion failed, at a path into the actual value (`""`: the value itself). */
export const Mismatch = Schema.Struct({
  path: Schema.String,
  expected: opt(Schema.String),
  actual: opt(Schema.String),
  reason: opt(Schema.String)
})
export type Mismatch = typeof Mismatch.Type

/** Source lines around a failure's location; the coordinator adds them (the executor sends none). */
export const SourceLine = Schema.Struct({
  line: Schema.Number,
  text: Schema.String
})
export type SourceLine = typeof SourceLine.Type

export const Failure = Schema.Struct({
  kind: FailureKind,
  message: Schema.String,
  /** the assertion's label */
  label: opt(Schema.String),
  /** every path at which the actual value differs (assertions) */
  mismatches: opt(Schema.Array(Mismatch)),
  errorTag: opt(Schema.String),
  errorFields: opt(Schema.String),
  /** where it failed, in the test file when the stack goes through it */
  location: opt(Location),
  /** where the assertion was raised, when that is elsewhere (a helper in another file) */
  origin: opt(Location),
  /** context, e.g. why a caught failure still fails the test */
  note: opt(Schema.String),
  /** the source at `location` */
  source: opt(Schema.Array(SourceLine))
})
export type Failure = typeof Failure.Type

export const Status = Schema.Literals(["passed", "failed", "skipped", "timedOut", "interrupted"])
export type Status = typeof Status.Type

export const PlannedTest = Schema.Struct({
  /** the project's root, relative to the workspace root (`.`: the workspace root itself) */
  project: Schema.String,
  /** the file (relative to the project root), then suite names, then the test name, joined by `" > "` */
  id: Schema.String,
  /** 8 hex characters derived from the project and `id`: stable across runs, accepted by `--test` */
  shortId: Schema.String,
  /** the file, relative to the workspace root */
  file: Schema.String,
  tags: Schema.Array(Schema.String),
  timeoutMs: Schema.Number,
  retries: Schema.Number,
  seed: Schema.Number,
  /** opted out of the "a test must make at least one assertion" rule */
  noAssertions: opt(Schema.Boolean),
  skip: opt(Schema.String)
})
export type PlannedTest = typeof PlannedTest.Type

/** A project a run searched, with what was found in it. */
export const SelectedProject = Schema.Struct({
  /** the project's root, relative to the workspace root (`.`: the workspace root itself) */
  project: Schema.String,
  /** its own config, relative to the workspace root (absent for the workspace root without one) */
  config: opt(Schema.String),
  files: Schema.Number,
  tests: Schema.Number
})
export type SelectedProject = typeof SelectedProject.Type

/** What a run selected, and how. */
export const Selection = Schema.Struct({
  /** the workspace root (absolute): the outermost config's directory, else the working directory. Paths are relative to it */
  root: Schema.String,
  /** the workspace's config, relative to the root (absent: none) */
  config: opt(Schema.String),
  /** the projects searched, in order; a project reached while searching that has no test file is listed too */
  projects: Schema.Array(SelectedProject),
  /** the paths searched, relative to the root (empty: the root) */
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
export const schemaVersion = 2

export const RunPlanned = Schema.TaggedStruct("RunPlanned", {
  schemaVersion: Schema.Literal(schemaVersion),
  runSeed: Schema.Number,
  selection: Selection,
  tests: Schema.Array(PlannedTest)
})
export const TestStarted = Schema.TaggedStruct("TestStarted", {
  project: Schema.String,
  id: Schema.String,
  attempt: Schema.Number
})
export const TestFinished = Schema.TaggedStruct("TestFinished", {
  project: Schema.String,
  id: Schema.String,
  status: Status,
  durationMs: Schema.Number,
  seed: Schema.Number,
  attempt: Schema.Number,
  /** failures of earlier attempts, when a retry eventually passed (flaky) */
  previousAttempts: Schema.Array(Schema.Struct({ attempt: Schema.Number, status: Status })),
  failures: Schema.Array(Failure),
  console: Schema.Array(Schema.String),
  /** assertions the test made (`Assert.*` calls) in its last attempt */
  assertions: opt(Schema.Number),
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
  noAssertions: opt(Schema.Boolean),
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
  retries: Schema.Number,
  noAssertions: opt(Schema.Boolean)
})
export type RunFileTest = typeof RunFileTest.Type

export class ExecutorRpcs extends RpcGroup.make(
  Rpc.make("ListFile", {
    payload: {
      path: Schema.String,
      /** the project root (absolute): ids are relative to it */
      root: Schema.String
    },
    success: Schema.Struct({ file: Schema.String, nodes: Schema.Array(ListedNode) }),
    error: LoadError
  }),
  Rpc.make("RunFile", {
    payload: {
      path: Schema.String,
      /** the project root (absolute): ids are relative to it */
      root: Schema.String,
      /** the project's key, echoed in every event */
      project: Schema.String,
      /** the configs whose `shared` layers the file's tests use (absolute), the workspace root's first */
      configs: Schema.Array(Schema.String),
      /** max concurrent tests (fibers) within this file */
      concurrency: Schema.Number,
      tests: Schema.Array(RunFileTest)
    },
    success: Schema.Union([TestStarted, TestFinished]),
    error: LoadError,
    stream: true
  })
) {}
