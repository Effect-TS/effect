---
"effect": patch
---

Add `Component.noop` and `Command.asNoop` to `effect/ui`, so a Command or an `onMount` with nothing to tell the component sends no message. `CommandEnded` records a run that sent nothing as `silent`, and `CommandEnded` and `CommandInterrupted` carry the run's span and trace ids.

### Breaking changes

- `onMount` no longer takes an Effect that ends with `void` or `undefined`, since a `void`-typed Effect can hold a value that would be sent as a message. End a mount with nothing to send with `Effect.as(Component.noop)`.
- A vocabulary element class that overrides `onMount` takes `Effect<Msg | Component.Noop>` in place of `Effect<Msg | void>`.
