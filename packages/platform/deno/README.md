# `@effect/platform-deno`

Provides Deno-specific implementations for the abstractions defined in [`@effect/platform`](https://github.com/Effect-TS/effect/tree/main/packages/platform), allowing you to write platform-independent code that integrates smoothly with Deno.

## Documentation

- **API Reference**: [View the full documentation](https://effect-ts.github.io/effect/docs/platform-deno).

## Known divergences

- `ChildProcess` rejects `detached` because `Deno.Command` cannot create a detached process group.
- `ChildProcess` rejects `additionalFds` because Deno supports only stdin, stdout, and stderr configuration.
- Killing a `ChildProcess` terminates only the direct child. Descendants are left running because Deno has no portable process-group isolation API.
