# effect-native

`effect-native` is the ultra extreme programming command-line interface for the Effect Native project. It shrinks every feedback loop so optimistic programmers see evidence immediately.

## Usage

```bash
npx effect-native --help
```

## Development

Run everything inside the Nix shell so native modules match the expected ABI:

```bash
nix develop
pnpm install
pnpm build
pnpm test -- --filter effect-native
```

## License

MIT
