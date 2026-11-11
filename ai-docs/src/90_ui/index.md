## Building user interfaces with `effect/ui`

`effect/ui` is a frontend framework composed with Layers. A component is a
value: Schemas for its props, Model, messages and events, plus pure `init`,
`update` and `view` functions. Side effects are Commands and Subscriptions
that the runtime runs, and data is loaded with `Loader` reads from
`effect/reactivity`. `effect/ui/html` adds the HTML elements, the browser
host and router, and server rendering.
