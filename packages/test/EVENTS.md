# The `etest` event stream (schema version 2)

`etest --reporter jsonl` writes one JSON object per line, as the run happens. This is the machine-readable
contract for tools and coding agents: fields are only added within a schema version. Removing or changing a
field bumps `schemaVersion` (in the first event). The Schemas in `src/Protocol.ts` are the source of truth.

Every run emits, in order: one `RunPlanned`, then a `TestStarted` (per attempt) and exactly one `TestFinished`
for every planned test, then one `RunFinished`. A run that selects no tests emits nothing on stdout: it writes
the reason to stderr and exits 1.

**Projects.** A test file belongs to the nearest `etest.config.ts` above it, its _project_; the outermost one
is the workspace root, where every run anchors. A test is identified by its `project` (the project's root
relative to the workspace root, `.` for the workspace root itself) and its `id` (relative to the project). The
two together, `project/id` (just `id` in the `.` project), are unique in a run: that is how reporters show a
test, and what `--test` matches.

Version 2 (projects) added `project` to every test and event, and `selection.projects`; `id` became relative to
the test's project, and `shortId` is derived from `project/id`. In a workspace of one project (`.`), ids and
short ids are unchanged from version 1.

## `RunPlanned`

```json
{
  "_tag": "RunPlanned",
  "schemaVersion": 2,
  "runSeed": 1234,
  "selection": {
    "root": "/home/me/repo",
    "config": "etest.config.ts",
    "projects": [
      { "project": ".", "config": "etest.config.ts", "files": 7, "tests": 52 },
      { "project": "packages/accounts", "config": "packages/accounts/etest.config.ts", "files": 1, "tests": 8 }
    ],
    "paths": [],
    "files": 8,
    "tests": 60,
    "filters": ["--test \"fees\""]
  },
  "tests": [
    {
      "project": "packages/accounts",
      "id": "test/accounts.test.ts > fees: … > one test can replace the shared layer",
      "shortId": "1a2b3c4d",
      "file": "packages/accounts/test/accounts.test.ts",
      "tags": [],
      "timeoutMs": 60000,
      "retries": 0,
      "seed": 3743281946
    }
  ]
}
```

- `selection`:
  - `root`: the workspace root (absolute: the outermost config's directory, else the working directory). Every
    path in the stream is relative to it.
  - `config`: the workspace's config, relative to the root (absent when there is none).
  - `projects[]`: the projects searched, in the order they were reached, each with its own `config` (absent for
    a workspace root without one) and the test `files` and `tests` found in it. A project the search reached that
    has no test file is listed with zero files.
  - `paths`: what was searched, relative to the root (empty meaning the root).
  - `files`, `tests`: how many test files and tests were found in total.
  - `filters`: what narrowed the selection, in command-line words (`--test "…"`, `--tag "…"`,
    `--failed (N recorded)`, …).
- `tests[]`: the plan, in a deterministic order.
  - `project`: the test's project (see above).
  - `id`: the file (relative to the project's root), then suite names, then the test name, joined by `" > "`.
  - `shortId`: 8 hex characters derived from `project/id`. It is stable across runs and accepted by `--test`.
  - `file`: the test file, relative to the workspace root.
  - `timeoutMs`, `retries`: resolved: the nearest suite or test that sets them, else the project config's
    `defaults`, else the workspace config's, else built-in.
  - `seed`: the test's own seed, derived from `runSeed` and `id`.
  - `skip` (optional): the reason the test won't run.
  - A file that failed to load or list appears as one entry whose `id` is the file's path (relative to its
    project) and `file` its path relative to the root.

## `TestStarted`

`{ "_tag": "TestStarted", "project": "…", "id": "…", "attempt": 1 }`, emitted once per attempt (retries start
again).

## `TestFinished`

```json
{
  "_tag": "TestFinished",
  "project": "…",
  "id": "…",
  "status": "failed",
  "durationMs": 5,
  "seed": 3743281946,
  "attempt": 1,
  "previousAttempts": [],
  "console": ["…"],
  "assertions": 1,
  "failures": [
    {
      "kind": "assertion",
      "message": "not equal: 2 differences",
      "mismatches": [
        { "path": "[\"roles\"][1]", "reason": "missing, expected \"dev\"" },
        { "path": "[\"address\"][\"zip\"]", "expected": "\"N1\"", "actual": "\"N2\"" }
      ],
      "location": { "file": "examples/failures.test.ts", "line": 29, "column": 16 },
      "source": [{ "line": 29, "text": "        Assert.equal(updated, user)" }]
    }
  ]
}
```

- `status`: `passed`, `failed`, `skipped`, `timedOut` or `interrupted`. Only `passed` and `skipped` are green.
- `failures[]`: empty when the test passed. Each failure has:
  - `kind`: `assertion`, `typedError`, `defect`, `timeout`, `interrupted`, `discardedEffect` (an Effect, or an
    assertion's Effect / Promise, that was never run), `noAssertions` (the test made no `Assert.*` calls),
    `fixture` or `load`.
  - `message`: one line for assertions (what went wrong); the details are in `mismatches`.
  - Optionally:
    - `label`: the assertion's label.
    - `mismatches[]`: for assertions, every path at which the actual value differs. `path` is formatted like
      `["user"]["tags"][1]` (`""` for the value itself), with either `expected` and `actual` (formatted values)
      or a `reason`.
    - `errorTag` and `errorFields` for a typed error.
    - `location` (`file`, `line`, `column`): in the test file when the failure's stack goes through it.
    - `origin`: where an assertion was raised, when that is elsewhere (a helper in another file).
    - `note`: context, e.g. that a failed assertion's error was caught but still fails the test.
    - `source[]`: the lines up to `location` (`line`, `text`), at most 3.
- `previousAttempts[]`: the statuses of earlier attempts. A `passed` test with earlier failures is flaky.
- `console[]`: the test's captured Effect `Console` output.
- `assertions` (optional): how many `Assert.*` calls the test's last attempt made.
- `skipReason`: why the test was skipped. `not run: --bail` / `not run: Ctrl-C` means it never started.

## `RunFinished`

`{ "_tag": "RunFinished", "passed": 47, "failed": 9, "skipped": 2, "timedOut": 2, "interrupted": 0, "total": 60,
"durationMs": 580, "bailed": false, "cancelled": false }`

The process exits 0 when nothing failed, timed out or was interrupted, 1 otherwise, and 130 on Ctrl-C.
