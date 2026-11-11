## Building user interfaces with `effect/ui`

`effect/ui` is a frontend framework whose apps are composed with Layers. You
describe a component with Schemas for its props, Model, messages and events,
and with pure `init`, `update` and `view` functions. Side effects are Commands
and Subscriptions that the runtime runs for you, and data comes from `Loader`
reads in `effect/reactivity`. `effect/ui/html` adds the HTML elements, the
browser host and router, and server rendering.

### Organizing an app

Group files by feature, then by kind within each feature. The examples use this
layout in a real app (the path comments mark definitions kept inline for teaching):

```text
App.ts                      // root component, imports pages
routes.ts                   // AppRoute
notes/
  domain/Note.ts            // schema, errors, NotesTag
  services/Notes.ts         // service and its Layers
  loaders/ListNotes.ts
  loaders/GetNote.ts
  components/NoteEditor.ts  // NoteEditor and its SaveNote command
  components/NoteActivity.ts
  components/ActivityLog.ts
pages/
  NotesIndex.ts
  NotePage.ts
```

A second feature is a sibling of `notes/`, with its own `domain`, `services`,
`loaders` and `components` folders. Keep one file per route in `pages/`: pages
import features, but features never import pages. Keep `AppRoute` in `routes.ts`,
outside `pages/` and separate from `App.ts`; pages can then build links without
importing the root component that imports them.

A command belongs in the file of the component that runs it, not in a shared
`commands/` folder. When two components need the same write, share the service
method and give each component its own command. Loaders have their own folder
because pages, multiple components and server rendering all read them.
