# EFFECT CLI

## OVERVIEW

Type-safe CLI framework with commands, options, args, and prompts.

## STRUCTURE

```
cli/
├── src/
│   ├── Command.ts       # Command definitions
│   ├── Options.ts       # Flag/option parsing
│   ├── Args.ts          # Positional arguments
│   ├── Prompt.ts        # Interactive prompts
│   └── internal/
│       └── prompt/      # Prompt implementations
└── test/
```

## WHERE TO LOOK

| Task            | Location     | Notes                              |
| --------------- | ------------ | ---------------------------------- |
| Define commands | `Command.ts` | Command.make, Command.run          |
| Parse flags     | `Options.ts` | Options.text, Options.boolean, etc |
| Positional args | `Args.ts`    | Args.text, Args.file, etc          |
| User prompts    | `Prompt.ts`  | Prompt.text, Prompt.confirm        |
| Help generation | `HelpDoc.ts` | Auto-generated help                |

## CONVENTIONS

### Command Definition

```typescript
const cli = Command.make("myapp", {
  version: Options.boolean("version").pipe(Options.withAlias("v")),
  config: Options.file("config").pipe(Options.optional)
}).pipe(
  Command.withHandler(({ version, config }) =>
    Effect.gen(function* () {
      if (version) return yield* Console.log("1.0.0")
      // ...
    })
  )
)
```

### Subcommands

```typescript
const main = Command.make("app").pipe(
  Command.withSubcommands([
    Command.make("init", { ... }),
    Command.make("build", { ... })
  ])
)
```

### Running

```typescript
Command.run(cli, {
  name: "myapp",
  version: "1.0.0"
})
```

## ANTI-PATTERNS

- **Never use process.argv directly** - Use Args/Options
- **Never console.log** - Use Console service

## NOTES

- Options/Args use Schema for validation
- Help text auto-generated from definitions
- Prompts work with Terminal service
- Completions can be generated for bash/zsh/fish
