---
"@effect/cli": minor
---

Refactors the `Prompt.custom` constructor to make it easier to create custom
`Prompt`s.

The `Prompt.custom` constructor reates a custom `Prompt` from the specified
initial state and handlers.

```ts
export const custom: <State, Output>(
  initialState: State | Effect<State, never, Prompt.Environment>,
  handlers: {
    readonly render: (
      state: State,
      action: Action<State, Output>
    ) => Effect<string, never, Environment>
    readonly process: (
      input: UserInput,
      state: State
    ) => Effect<Action<State, Output>, never, Environment>
    readonly clear: (
      state: State,
      action: Action<State, Output>
    ) => Effect<string, never, Environment>
  }
) => Prompt<Output> = InternalPrompt.custom
```

The initial state of a `Prompt` can either be a pure value or an `Effect`. This
is particularly useful when the initial state of the `Prompt` must be computed
by performing some effectful computation, such as reading data from the file
system.

A `Prompt` is essentially a render loop where user input triggers a new frame
to be rendered to the `Terminal`. The `handlers` of a custom prompt are used
to control what is rendered to the `Terminal` each frame. During each frame,
the following occurs:

  1. The `render` handler is called with this frame's prompt state and prompt
     action and returns an ANSI escape string to be rendered to the
     `Terminal`
  2. The `Terminal` obtains input from the user
  3. The `process` handler is called with the input obtained from the user
     and this frame's prompt state and returns the next prompt action that
     should be performed
  4. The `clear` handler is called with this frame's prompt state and prompt
     action and returns an ANSI escape string used to clear the screen of
     the `Terminal`
