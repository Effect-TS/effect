# Example Suggestions: `effect/FileSystem`

- **Package:** `effect`
- **Source:** `packages/effect/src/FileSystem.ts`
- **Uncovered API records:** 43
- **Priorities:** 0 required, 1 recommended, 41 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind                    | Priority        |
| ------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/FileSystem.make`                               |  686 | `root-declaration`      | **recommended** |
| `effect/FileSystem.isFile`                             |  994 | `root-declaration`      | **optional**    |
| `effect/FileSystem.FileSystem.access`                  |   85 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.copy`                    |  100 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.copyFile`                |  111 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.chmod`                   |  118 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.chown`                   |  125 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.glob`                    |  133 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.exists`                  |  143 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.link`                    |  149 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.makeDirectory`           |  157 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.makeTempDirectory`       |  176 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.makeTempDirectoryScoped` |  188 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.makeTempFile`            |  197 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.makeTempFileScoped`      |  210 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.open`                    |  222 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.readDirectory`           |  237 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.readFile`                |  246 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.readFileString`          |  252 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.readLink`                |  259 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.realPath`                |  265 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.remove`                  |  271 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.rename`                  |  287 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.sink`                    |  294 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.stat`                    |  304 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.stream`                  |  321 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.symlink`                 |  332 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.truncate`                |  340 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.utimes`                  |  347 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.watch`                   |  361 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.writeFile`               |  365 | `member`                | **optional**    |
| `effect/FileSystem.FileSystem.writeFileString`         |  376 | `member`                | **optional**    |
| `effect/FileSystem.File`                               | 1058 | `namespace`             | **optional**    |
| `effect/FileSystem.File.Type`                          | 1070 | `namespace-declaration` | **optional**    |
| `effect/FileSystem.SeekMode`                           | 1163 | `root-declaration`      | **optional**    |
| `effect/FileSystem.WatchOptions`                       | 1171 | `root-declaration`      | **optional**    |
| `effect/FileSystem.WatchOptions.recursive`             | 1175 | `member`                | **optional**    |
| `effect/FileSystem.WatchEvent (type) (type)`           | 1196 | `root-declaration`      | **optional**    |
| `effect/FileSystem.WatchEvent (type) (type)`           | 1203 | `namespace`             | **optional**    |
| `effect/FileSystem.WatchEvent.Create`                  | 1215 | `namespace-declaration` | **optional**    |
| `effect/FileSystem.WatchEvent.Update`                  | 1231 | `namespace-declaration` | **optional**    |
| `effect/FileSystem.WatchEvent.Remove`                  | 1247 | `namespace-declaration` | **optional**    |
| `effect/FileSystem.FileTypeId`                         |  972 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/FileSystem.make`

- **Source:** `packages/effect/src/FileSystem.ts:686`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a FileSystem implementation from a partial implementation.
- **Signature hint:** `declare function make(impl: Omit<FileSystem, typeof TypeId | 'exists' | 'readFileString' | 'stream' | 'sink' | 'writeFileString'>): FileSystem`
- **Import guidance:** Start from `import { FileSystem } from "effect"` and use `FileSystem.make`.
- **Suggested snippet:** Construct one representative value with `FileSystem.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/FileSystem.isFile`

- **Source:** `packages/effect/src/FileSystem.ts:994`
- **Kind / category:** `root-declaration` / `file`
- **Priority:** **optional**
- **Current description:** Returns `true` if a value is a `File` handle by checking for the `FileTypeId` marker.
- **Signature hint:** `declare function isFile(u: unknown): u is File`
- **Import guidance:** Start from `import { FileSystem } from "effect"` and use `FileSystem.isFile`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `FileSystem.isFile` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.access`

- **Source:** `packages/effect/src/FileSystem.ts:85`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Checks whether a file can be accessed. You can optionally specify the level of access to check for.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.access` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.copy`

- **Source:** `packages/effect/src/FileSystem.ts:100`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Copy a file or directory from `fromPath` to `toPath`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.copy` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.copyFile`

- **Source:** `packages/effect/src/FileSystem.ts:111`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Copy a file from `fromPath` to `toPath`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.copyFile` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.chmod`

- **Source:** `packages/effect/src/FileSystem.ts:118`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Change the permissions of a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.chmod` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.chown`

- **Source:** `packages/effect/src/FileSystem.ts:125`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Change the owner and group of a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.chown` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.glob`

- **Source:** `packages/effect/src/FileSystem.ts:133`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Glob a directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.glob` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.exists`

- **Source:** `packages/effect/src/FileSystem.ts:143`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Checks whether a path exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.exists` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.link`

- **Source:** `packages/effect/src/FileSystem.ts:149`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a hard link from `fromPath` to `toPath`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.link` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.makeDirectory`

- **Source:** `packages/effect/src/FileSystem.ts:157`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a directory at `path`. You can optionally specify the mode and whether to recursively create nested directories.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.makeDirectory` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.makeTempDirectory`

- **Source:** `packages/effect/src/FileSystem.ts:176`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a temporary directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.makeTempDirectory` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.makeTempDirectoryScoped`

- **Source:** `packages/effect/src/FileSystem.ts:188`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a temporary directory inside a scope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.makeTempDirectoryScoped` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.makeTempFile`

- **Source:** `packages/effect/src/FileSystem.ts:197`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a temporary file. The directory creation is functionally equivalent to `makeTempDirectory`. The file name will be a randomly generated string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.makeTempFile` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.makeTempFileScoped`

- **Source:** `packages/effect/src/FileSystem.ts:210`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a temporary file inside a scope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.makeTempFileScoped` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.open`

- **Source:** `packages/effect/src/FileSystem.ts:222`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Open a file at `path` with the specified `options`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.open` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.readDirectory`

- **Source:** `packages/effect/src/FileSystem.ts:237`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** List the contents of a directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.readDirectory` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.readFile`

- **Source:** `packages/effect/src/FileSystem.ts:246`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Read the contents of a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.readFile` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.readFileString`

- **Source:** `packages/effect/src/FileSystem.ts:252`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Read the contents of a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.readFileString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.readLink`

- **Source:** `packages/effect/src/FileSystem.ts:259`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Read the destination of a symbolic link.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.readLink` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.realPath`

- **Source:** `packages/effect/src/FileSystem.ts:265`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Resolve a path to its canonicalized absolute pathname.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.realPath` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.remove`

- **Source:** `packages/effect/src/FileSystem.ts:271`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Remove a file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.remove` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.rename`

- **Source:** `packages/effect/src/FileSystem.ts:287`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Rename a file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.rename` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.sink`

- **Source:** `packages/effect/src/FileSystem.ts:294`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a writable `Sink` for the specified `path`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.sink` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.stat`

- **Source:** `packages/effect/src/FileSystem.ts:304`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get information about a file at `path`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.stat` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.stream`

- **Source:** `packages/effect/src/FileSystem.ts:321`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a readable `Stream` for the specified `path`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.stream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.symlink`

- **Source:** `packages/effect/src/FileSystem.ts:332`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a symbolic link from `fromPath` to `toPath`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.symlink` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.truncate`

- **Source:** `packages/effect/src/FileSystem.ts:340`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Truncate a file to a specified length. If the `length` is not specified, the file will be truncated to length `0`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.truncate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.utimes`

- **Source:** `packages/effect/src/FileSystem.ts:347`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Change the file system timestamps of the file at `path`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.utimes` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.watch`

- **Source:** `packages/effect/src/FileSystem.ts:361`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Watch a directory or file for changes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.watch` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.writeFile`

- **Source:** `packages/effect/src/FileSystem.ts:365`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Write data to a file at `path`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.writeFile` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.FileSystem.writeFileString`

- **Source:** `packages/effect/src/FileSystem.ts:376`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Write a string to a file at `path`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.FileSystem.writeFileString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.File`

- **Source:** `packages/effect/src/FileSystem.ts:1058`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing types associated with open file handles, including file descriptors, entry kinds, and stat information.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.File`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.File.Type`

- **Source:** `packages/effect/src/FileSystem.ts:1070`
- **Kind / category:** `namespace-declaration` / `file`
- **Priority:** **optional**
- **Current description:** Enumeration of possible file system entry types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.File.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.SeekMode`

- **Source:** `packages/effect/src/FileSystem.ts:1163`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Specifies the reference point for seeking within an open file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.SeekMode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.WatchOptions`

- **Source:** `packages/effect/src/FileSystem.ts:1171`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Options for watching files or directories.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.WatchOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.WatchOptions.recursive`

- **Source:** `packages/effect/src/FileSystem.ts:1175`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** When `true`, changes in subdirectories are also reported.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/FileSystem.WatchOptions.recursive` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.WatchEvent (type) (type)`

- **Source:** `packages/effect/src/FileSystem.ts:1196`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents file system events emitted when watching files or directories.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.WatchEvent (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.WatchEvent (type) (type)`

- **Source:** `packages/effect/src/FileSystem.ts:1203`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing the concrete event shapes emitted by `FileSystem.watch`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.WatchEvent (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.WatchEvent.Create`

- **Source:** `packages/effect/src/FileSystem.ts:1215`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Event representing the creation of a new file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.WatchEvent.Create`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.WatchEvent.Update`

- **Source:** `packages/effect/src/FileSystem.ts:1231`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Event representing the modification of an existing file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.WatchEvent.Update`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/FileSystem.WatchEvent.Remove`

- **Source:** `packages/effect/src/FileSystem.ts:1247`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Event representing the deletion of a file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/FileSystem.WatchEvent.Remove`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/FileSystem.FileTypeId`

- **Source:** `packages/effect/src/FileSystem.ts:972`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to `FileSystem.File` handles and used by `isFile` to recognize them.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { FileSystem } from "effect"` and use `FileSystem.FileTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `FileSystem.FileTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
