# Example Suggestions: `effect/unstable/process/ChildProcessSpawner`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 2 recommended, 17 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                          | Line | Kind               | Priority        |
| ---------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessSpawner`            |  252 | `root-declaration` | **recommended** |
| `effect/unstable/process/ChildProcessSpawner.make`                           |  223 | `root-declaration` | **recommended** |
| `effect/unstable/process/ChildProcessSpawner.ExitCode (value)`               |   37 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ProcessId (value)`              |   54 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.makeHandle`                     |  213 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ExitCode (type)`                |   29 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ProcessId (type)`               |   46 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.Reref`                          |   69 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle`             |   79 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.pid`         |   84 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.exitCode`    |   89 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.isRunning`   |   94 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.kill`        |  102 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stdin`       |  106 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stdout`      |  115 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stderr`      |  124 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.all`         |  129 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.getInputFd`  |  139 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.getOutputFd` |  149 | `member`           | **optional**    |

## Recommended

### `effect/unstable/process/ChildProcessSpawner.ChildProcessSpawner`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:252`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for child process spawning.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ChildProcessSpawner } from "effect/unstable/process"` and use `ChildProcessSpawner.ChildProcessSpawner`.
- **Suggested snippet:** Consume `ChildProcessSpawner.ChildProcessSpawner` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/process/ChildProcessSpawner.make`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:223`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **recommended**
- **Current description:** Creates a `ChildProcessSpawner` service from a `spawn` function, deriving helpers for exit codes and output collection from that implementation.
- **Signature hint:** `declare function make(spawn: ChildProcessSpawner['Service']['spawn']): ChildProcessSpawner['Service']`
- **Import guidance:** Start from `import { ChildProcessSpawner } from "effect/unstable/process"` and use `ChildProcessSpawner.make`.
- **Suggested snippet:** Construct one representative value with `ChildProcessSpawner.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/process/ChildProcessSpawner.ExitCode (value)`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:37`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs branded child process `ExitCode` values.
- **Signature hint:** `declare function ExitCode(unbranded: number): ExitCode`
- **Import guidance:** Start from `import { ChildProcessSpawner } from "effect/unstable/process"` and use `ChildProcessSpawner.ExitCode`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs branded child process `ExitCode` values. Call `ChildProcessSpawner.ExitCode` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ProcessId (value)`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:54`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs branded child process `ProcessId` values.
- **Signature hint:** `declare function ProcessId(unbranded: number): ProcessId`
- **Import guidance:** Start from `import { ChildProcessSpawner } from "effect/unstable/process"` and use `ChildProcessSpawner.ProcessId`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs branded child process `ProcessId` values. Call `ChildProcessSpawner.ProcessId` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.makeHandle`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:213`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new `ChildProcessHandle`.
- **Signature hint:** `declare function makeHandle(params: Omit<ChildProcessHandle, typeof HandleTypeId>): ChildProcessHandle`
- **Import guidance:** Start from `import { ChildProcessSpawner } from "effect/unstable/process"` and use `ChildProcessSpawner.makeHandle`.
- **Suggested snippet:** Construct one representative value with `ChildProcessSpawner.makeHandle`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ExitCode (type)`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Branded number representing the exit code reported by a child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcessSpawner.ExitCode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ProcessId (type)`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:46`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Branded number representing the operating system process identifier of a child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcessSpawner.ProcessId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.Reref`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:69`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An `Effect` that adds an unrefed child process back into the parent process's reference count.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcessSpawner.Reref`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:79`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A handle to a running child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.pid`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:84`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The child process process identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.pid` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.exitCode`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:89`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Waits for the child process to exit and returns the `ExitCode` of the command that was run.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.exitCode` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.isRunning`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` if the child process is still running, otherwise returns `false`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.isRunning` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.kill`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:102`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Kills the child process with the provided signal.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.kill` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stdin`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:106`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The standard input sink for the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stdin` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stdout`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:115`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The standard output stream for the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stdout` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stderr`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:124`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The standard error stream for the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.stderr` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.all`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:129`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A stream which combines and interleaves all messages output by the child process `stdout` and `stderr` streams.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.all` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.getInputFd`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:139`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get an input `Sink` for writing to a file descriptor configured via `ChildProcessOptions.additionalFds`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.getInputFd` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.getOutputFd`

- **Source:** `packages/effect/src/unstable/process/ChildProcessSpawner.ts:149`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get an output `Stream` for reading from a file descriptor configured via `ChildProcessOptions.additionalFds`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcessSpawner.ChildProcessHandle.getOutputFd` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
