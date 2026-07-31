# Example Suggestions: `effect/unstable/process/ChildProcess`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts`
- **Uncovered API records:** 43
- **Priorities:** 0 required, 3 recommended, 40 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                 | Line | Kind               | Priority        |
| ----------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/process/ChildProcess.isCommand`                                    |  520 | `root-declaration` | **recommended** |
| `effect/unstable/process/ChildProcess.isStandardCommand`                            |  528 | `root-declaration` | **recommended** |
| `effect/unstable/process/ChildProcess.isPipedCommand`                               |  536 | `root-declaration` | **recommended** |
| `effect/unstable/process/ChildProcess.KillOptions`                                  |  242 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions`                               |  374 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.parseFdName`                                  |  857 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.fdName`                                       |  870 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.Command`                                      |   32 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.StandardCommand`                              |   42 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.PipedCommand`                                 |   62 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.PipeFromOption`                               |   88 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.PipeToOption`                                 |  101 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.PipeOptions.from`                             |  132 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.PipeOptions.to`                               |  142 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandInput`                                 |  151 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOutput`                                |  164 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.Signal`                                       |  177 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.Encoding`                                     |  222 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.KillOptions.killSignal`                       |  246 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.KillOptions.forceKillAfter`                   |  253 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.StdinConfig`                                  |  262 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.StdinConfig.stream`                           |  276 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.StdinConfig.endOnDone`                        |  281 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.StdinConfig.encoding`                         |  285 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.StdoutConfig`                                 |  294 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.StdoutConfig.stream`                          |  308 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.StderrConfig`                                 |  317 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.StderrConfig.stream`                          |  331 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.AdditionalFdConfig`                           |  340 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.AdditionalFdConfig.type (member at line 347)` |  347 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.AdditionalFdConfig.stream`                    |  352 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.AdditionalFdConfig.type (member at line 360)` |  360 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.AdditionalFdConfig.sink`                      |  365 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.cwd`                           |  378 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.env`                           |  393 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.extendEnv`                     |  405 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.shell`                         |  419 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.detached`                      |  434 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.stdin`                         |  438 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.stdout`                        |  442 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.CommandOptions.stderr`                        |  446 | `member`           | **optional**    |
| `effect/unstable/process/ChildProcess.TemplateExpressionItem`                       |  490 | `root-declaration` | **optional**    |
| `effect/unstable/process/ChildProcess.TemplateExpression`                           |  498 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/process/ChildProcess.isCommand`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:520`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a value is a `Command`.
- **Signature hint:** `declare function isCommand(u: unknown): u is Command`
- **Import guidance:** Start from `import { ChildProcess } from "effect/unstable/process"` and use `ChildProcess.isCommand`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `ChildProcess.isCommand` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/process/ChildProcess.isStandardCommand`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:528`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a command is a `StandardCommand`.
- **Signature hint:** `declare function isStandardCommand(command: Command): command is StandardCommand`
- **Import guidance:** Start from `import { ChildProcess } from "effect/unstable/process"` and use `ChildProcess.isStandardCommand`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `ChildProcess.isStandardCommand` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/process/ChildProcess.isPipedCommand`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:536`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a command is a `PipedCommand`.
- **Signature hint:** `declare function isPipedCommand(command: Command): command is PipedCommand`
- **Import guidance:** Start from `import { ChildProcess } from "effect/unstable/process"` and use `ChildProcess.isPipedCommand`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `ChildProcess.isPipedCommand` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/process/ChildProcess.KillOptions`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:242`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options that can be used to control how a child process is terminated.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.KillOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:374`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for command execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.CommandOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.parseFdName`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:857`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Parses an fd name like "fd3" to its numeric index. Returns undefined if the name is invalid.
- **Signature hint:** `declare function parseFdName(name: string): number | undefined`
- **Import guidance:** Start from `import { ChildProcess } from "effect/unstable/process"` and use `ChildProcess.parseFdName`.
- **Suggested snippet:** Convert one representative external input with `ChildProcess.parseFdName` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.fdName`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:870`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Create an fd name from its numeric index.
- **Signature hint:** `declare function fdName(fd: number): string`
- **Import guidance:** Start from `import { ChildProcess } from "effect/unstable/process"` and use `ChildProcess.fdName`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Create an fd name from its numeric index. Call `ChildProcess.fdName` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.Command`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:32`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A command that can be built using `make`, combined using `pipeTo`, and executed using `exec` or `spawn`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.Command`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StandardCommand`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A standard command with pre-parsed command and arguments.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.StandardCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.PipedCommand`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:62`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A pipeline of commands where the output of one is piped to the input of the next.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.PipedCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.PipeFromOption`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:88`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Specifies which stream to pipe from the source subprocess.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.PipeFromOption`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.PipeToOption`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:101`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Specifies which input to pipe to on the destination subprocess.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.PipeToOption`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.PipeOptions.from`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:132`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Which stream to pipe from the source subprocess.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.PipeOptions.from` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.PipeOptions.to`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:142`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Which input to pipe to on the destination subprocess.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.PipeOptions.to` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandInput`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:151`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input type for child process stdin.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.CommandInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOutput`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:164`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Output type for child process stdout/stderr.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.CommandOutput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.Signal`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:177`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A signal that can be sent to a child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.Signal`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.Encoding`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:222`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The encoding format to use for binary data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.Encoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.KillOptions.killSignal`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:246`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The default signal used to terminate the child process. Defaults to `"SIGTERM"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.KillOptions.killSignal` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.KillOptions.forceKillAfter`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:253`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The duration of time to wait after the child process has been terminated before forcefully killing the child process by sending it the `"SIGKILL"` signal. Defaults to `undefined`, which means that no timeout will be enforced by default.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.KillOptions.forceKillAfter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StdinConfig`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:262`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for the child process standard input stream.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.StdinConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StdinConfig.stream`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:276`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The configuration for the standard input stream of the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.StdinConfig.stream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StdinConfig.endOnDone`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:281`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether or not the child process `stdin` should be closed after the input stream is finished. Defaults to `true`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.StdinConfig.endOnDone` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StdinConfig.encoding`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:285`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The buffer encoding to use to decode string chunks. Defaults to `utf-8`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.StdinConfig.encoding` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StdoutConfig`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:294`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for the child process standard output stream.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.StdoutConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StdoutConfig.stream`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:308`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The configuration for the standard output stream of the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.StdoutConfig.stream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StderrConfig`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:317`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for the child process standard error stream.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.StderrConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.StderrConfig.stream`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:331`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The configuration for the standard error stream of the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.StderrConfig.stream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.AdditionalFdConfig`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:340`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for additional file descriptors to expose to the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.AdditionalFdConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.AdditionalFdConfig.type (member at line 347)`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:347`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The direction of data flow for this file descriptor. - "input": Data flows from parent to child (writable by parent) - "output": Data flows from child to parent (readable by parent)
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.AdditionalFdConfig.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.AdditionalFdConfig.stream`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:352`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** For input file descriptors, an optional stream to pipe into the file descriptor..
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.AdditionalFdConfig.stream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.AdditionalFdConfig.type (member at line 360)`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:360`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The direction of data flow for this file descriptor. - "input": Data flows from parent to child (writable by parent) - "output": Data flows from child to parent (readable by parent)
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.AdditionalFdConfig.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.AdditionalFdConfig.sink`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:365`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** For output file descriptors, an optional sink which receives data from the file descriptor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.AdditionalFdConfig.sink` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.cwd`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:378`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The current working directory of the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.cwd` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.env`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:393`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The environment of the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.env` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.extendEnv`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:405`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** If set to `true`, the child process uses both the values in `env` as well as the values in `globalThis.process.env`, prioritizing the values in `env` when conflicts exist.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.extendEnv` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.shell`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:419`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** If set to `true`, runs the command inside of a shell, defaulting to `/bin/sh` on UNIX systems and `cmd.exe` on Windows.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.shell` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.detached`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:434`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** If set to `true`, the child process will run independently of the parent process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.detached` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.stdin`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:438`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Configuration options for the standard input stream for the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.stdin` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.stdout`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:442`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Configuration options for the standard output stream for the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.stdout` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.CommandOptions.stderr`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:446`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Configuration options for the standard error stream for the child process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/process/ChildProcess.CommandOptions.stderr` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.TemplateExpressionItem`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:490`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Valid template expression item types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.TemplateExpressionItem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/process/ChildProcess.TemplateExpression`

- **Source:** `packages/effect/src/unstable/process/ChildProcess.ts:498`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Template expression type for interpolated values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/process/ChildProcess.TemplateExpression`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
