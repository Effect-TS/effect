# The `etest` event stream (schema version 1)

`etest --reporter jsonl` writes one JSON object per line, as the run happens. This is the machine-readable
contract for tools and coding agents: fields are only added within a schema version. Removing or changing a
field bumps `schemaVersion` (in the first event). The Schemas in `src/Protocol.ts` are the source of truth.

Every run emits, in order: one `RunPlanned`, then a `TestStarted` (per attempt) and exactly one `TestFinished`
for every planned test, then one `RunFinished`. A run that selects no tests emits nothing on stdout: it writes
the reason to stderr and exits 1.

## `RunPlanned`

```json
{
  "_tag": "RunPlanned",
  "schemaVersion": 1,
  "runSeed": 1234,
  "selection": {
    "root": "/home/me/project",
    "config": "etest.config.ts",
    "paths": ["examples"],
    "files": 8,
    "tests": 60,
    "filters": ["--test \"fees\""]
  },
  "tests": [
    {
      "id": "examples/accounts.test.ts > fees: … > one test can replace the shared layer",
      "shortId": "1a2b3c4d",
      "file": "examples/accounts.test.ts",
      "tags": [],
      "timeoutMs": 5000,
      "retries": 0,
      "seed": 3743281946
    }
  ]
}
```

- `selection`: the project `root` (absolute: the config's directory, else the working directory; every path in the
  stream is relative to it), the `config` file (relative to the root; absent when there is none), what was searched
  (`paths`, empty meaning the root), how many test `files` and
  `tests` were found, and the `filters` that narrowed it, in command-line words (`--test "…"`, `--tag "…"`,
  `--failed (N recorded)`, …).
- `tests[]`: the plan, in a deterministic order.
  - `id` is the full id: the file, then suite names, then the test name, joined by `" > "`.
  - `shortId` is 8 hex characters derived from `id`. It is stable across runs and accepted by `--test`.
  - `seed` is the test's own seed, derived from `runSeed` and `id`.
  - `skip` (optional) is the reason the test won't run.
  - A file that failed to load or list appears as one entry whose `id` and `file` are the file path.

## `TestStarted`

`{ "_tag": "TestStarted", "id": "…", "attempt": 1 }`, emitted once per attempt (retries start again).

## `TestFinished`

```json
{
  "_tag": "TestFinished",
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
