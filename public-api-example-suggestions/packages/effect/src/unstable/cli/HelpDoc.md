# Example Suggestions: `effect/unstable/cli/HelpDoc`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts`
- **Uncovered API records:** 28
- **Priorities:** 0 required, 0 recommended, 28 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                          | Line | Kind               | Priority     |
| ------------------------------------------------------------ | ---: | ------------------ | ------------ |
| `effect/unstable/cli/HelpDoc.HelpDoc.description`            |   69 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.HelpDoc.usage`                  |   75 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.HelpDoc.flags`                  |   80 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.HelpDoc.globalFlags`            |   85 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.HelpDoc.annotations`            |   90 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.HelpDoc.args`                   |   95 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.HelpDoc.subcommands`            |  100 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.HelpDoc.examples`               |  105 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.ExampleDoc`                     |  114 | `root-declaration` | **optional** |
| `effect/unstable/cli/HelpDoc.ExampleDoc.command`             |  118 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.ExampleDoc.description`         |  123 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.FlagDoc.name`                   |  161 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.FlagDoc.aliases`                |  166 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.FlagDoc.type`                   |  171 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.FlagDoc.description`            |  176 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.FlagDoc.required`               |  181 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.SubcommandDoc.name`             |  229 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.SubcommandDoc.alias`            |  234 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.SubcommandDoc.shortDescription` |  239 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.SubcommandDoc.description`      |  244 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.SubcommandGroupDoc`             |  253 | `root-declaration` | **optional** |
| `effect/unstable/cli/HelpDoc.SubcommandGroupDoc.group`       |  258 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.SubcommandGroupDoc.commands`    |  263 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.ArgDoc.name`                    |  310 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.ArgDoc.type`                    |  315 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.ArgDoc.description`             |  320 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.ArgDoc.required`                |  325 | `member`           | **optional** |
| `effect/unstable/cli/HelpDoc.ArgDoc.variadic`                |  330 | `member`           | **optional** |

## Optional

### `effect/unstable/cli/HelpDoc.HelpDoc.description`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:69`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Brief description of what the command does
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.HelpDoc.usage`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:75`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Usage syntax showing how to invoke the command Example: "myapp deploy [flags]"
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.usage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.HelpDoc.flags`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** List of available flags/options for this command
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.flags` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.HelpDoc.globalFlags`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:85`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Global flags available to all commands (e.g., --help, --version).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.globalFlags` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.HelpDoc.annotations`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:90`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Custom command annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.annotations` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.HelpDoc.args`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:95`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** List of positional arguments for this command
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.args` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.HelpDoc.subcommands`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:100`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional list of subcommands if this is a parent command
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.subcommands` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.HelpDoc.examples`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:105`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional concrete usage examples for the command
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.HelpDoc.examples` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ExampleDoc`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:114`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Documentation for a command usage example
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/HelpDoc.ExampleDoc`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ExampleDoc.command`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:118`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Command line invocation example
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.ExampleDoc.command` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ExampleDoc.description`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:123`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional explanation for the example
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.ExampleDoc.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.FlagDoc.name`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:161`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Primary name of the flag (e.g., "verbose")
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.FlagDoc.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.FlagDoc.aliases`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Alternative names/aliases for the flag (e.g., ["-v"])
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.FlagDoc.aliases` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.FlagDoc.type`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:171`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Type of the flag value (e.g., "string", "boolean", "integer")
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.FlagDoc.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.FlagDoc.description`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:176`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Description of what the flag does
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.FlagDoc.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.FlagDoc.required`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:181`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this flag is required
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.FlagDoc.required` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.SubcommandDoc.name`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:229`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the subcommand
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.SubcommandDoc.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.SubcommandDoc.alias`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:234`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional short alias for invoking the subcommand.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.SubcommandDoc.alias` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.SubcommandDoc.shortDescription`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:239`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional short description of what the subcommand does.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.SubcommandDoc.shortDescription` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.SubcommandDoc.description`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:244`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Brief description of what the subcommand does
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.SubcommandDoc.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.SubcommandGroupDoc`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:253`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Documentation for a grouped subcommand listing
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/HelpDoc.SubcommandGroupDoc`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.SubcommandGroupDoc.group`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:258`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Group name used in help output. Undefined means the default ungrouped section.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.SubcommandGroupDoc.group` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.SubcommandGroupDoc.commands`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:263`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Subcommands in this group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.SubcommandGroupDoc.commands` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ArgDoc.name`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:310`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the argument (e.g., "source", "destination")
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.ArgDoc.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ArgDoc.type`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:315`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Type of the argument value (e.g., "string", "file", "directory")
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.ArgDoc.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ArgDoc.description`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:320`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Description of what the argument is for
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.ArgDoc.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ArgDoc.required`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:325`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this argument is required or optional
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.ArgDoc.required` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/HelpDoc.ArgDoc.variadic`

- **Source:** `packages/effect/src/unstable/cli/HelpDoc.ts:330`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this argument is variadic (accepts multiple values)
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/HelpDoc.ArgDoc.variadic` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
