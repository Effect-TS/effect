# @effect-native/example

Example custom package demonstrating how to create Effect-based packages in the effect-native fork.

## Installation

```bash
npm install @effect-native/example
# or
pnpm add @effect-native/example
```

## Usage

```typescript
import { greet } from "@effect-native/example"
import * as Effect from "effect/Effect"

const program = greet("World")
console.log(Effect.runSync(program))
// Output: Hello World from @effect-native/example!
```

## Attribution

This package is part of the effect-native fork and uses the Effect framework.

- Based on: [Effect](https://github.com/Effect-TS/effect)
- Original Copyright: (c) 2023 Effectful Technologies Inc
- Fork Copyright: (c) 2025 effect-native contributors

## License

MIT - See [LICENSE](./LICENSE) for details

## Disclaimer

This package is not affiliated with or endorsed by Effectful Technologies Inc or the Effect project maintainers.