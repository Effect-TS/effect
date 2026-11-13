## Building user interfaces with `effect/ui`

`effect/ui` is a frontend framework whose apps are composed with Layers. You
describe a component with Schemas for its props, Model, messages and events,
and with pure `init`, `update` and `view` functions. Side effects are Commands
and Subscriptions that the runtime runs for you, and data comes from `Loader`
reads in `effect/reactivity`. `effect/ui/html` adds the HTML elements, the
browser host and router, and server rendering.

A `Command.Service` may omit `invalidates` when it invalidates no reads.
Provide a feature implementation with `NoteActivity.toLayer(ActivityLog)`.
When rendering a feature service with `h.child`, include a `fallback` for
loading or failure; a child passed as a component value may omit it.

A parent passes a child state through props, and a child answers through
`events`. A one-shot instruction, such as "save now" or "clear your draft",
is a send: the child lists the tags it accepts in `receives`, the parent
renders the slot with a ref from `Child.ref("Name")`, and its `update` calls
`$.send(ref, message)`. Don't send what the child shows: that belongs in its
props.

### Loading data

A component declares the reads it shows in `loaders`, by name. Each entry
names a read and returns its args from the Model, the props and the other
loaders' results, or `undefined` to disable it:

```ts
loaders: {
  note: { load: GetNote, args: (_model, props) => ({ id: props.id }) },
  // Waits for the args to hold still before it fetches.
  results: { load: SearchNotes, debounce: "300 millis", args: (model) => ({ q: model.q }) },
  // One read at many args, one entry per args.
  authors: { loadMany: GetUser, args: (_model, props) => props.authorIds.map((id) => ({ id })) }
}
```

The runtime watches each read and keeps its last result in a slot beside the
Model. A slot that changes re-renders the instance, without a message. The
Model holds what the user did, and never a copy of loaded data. The Model plus
the slots is the instance's state: the server ships it and the history entry
keeps it as `{ model, loaded }`, so a hydrated or restored instance starts
with the results it had.

Every function of the component can read the slots, by loader name:
`h.loaded` in `view`, `$.loaded` in `update`, and the `loaded` argument of
`head(model, loaded)` and `subscriptions(model, props, loaded)`. Give an entry
an `onChange` only when `update` has to react to a new result, such as
moving focus once a read fails. It returns a message, which `update` gets
after the slot is written.

In tests, `Story` load steps such as `loaded("note", note)` take the loader's
name and write its slot. To start from loaded data without sending
`onChange`'s message, pass the results to `given`:
`s.given(model, { note })`. The `MessageLog` records each slot write as a
`LoaderChanged` entry, and an `Update` entry only for an `onChange` message.
Each `Update` entry records the slots `update` read, so `Story.fromLog`
replays `$.loaded` as it was. New props from a parent are logged as a
`PropsChanged` entry, so the result's `props` and `loaded()` hold what the
instance ended with.

### Headless components

A component finished with `parts` instead of `view` is headless: it keeps
its own Model, `update` and Commands, and owns behaviour such as keyboard
handling, ids and ARIA, but no markup. A consumer places it with `h.child`
and a `view` closure that applies each part to a builder of its own:
`m.trigger(h.button).children("Open")`. The closure is the consumer's code,
so children declared in it report to the consumer. Pass rows as Schema data in
props, and keep richer row content in the closure, looked up by id. The
closure runs whenever the consumer renders, so wrap a headless child in a
small normal component when the consumer renders often. Test one with
`Story.parts`, which needs no runtime.

### Organizing an app

The examples below are one notes app. Each example is an entry module, for
the browser, the server or the tests. It mounts a component and provides the
platform Layers, and it defines no components. The app is in
`ai-docs/src/90_ui/fixtures`, laid out as it would be under `src/` in a real
app. Read an example, then the files it imports.

Group files by feature, then by kind within each feature:

```text
fixtures/
  App.ts                      // root component, imports pages
  routes.ts                   // AppRoute
  kit/Listbox.ts              // headless components no feature owns
  notes/
    domain/Note.ts            // Schema, errors, NotesTag
    services/Notes.ts         // service and its Layers
    loaders/ListNotes.ts
    loaders/GetNote.ts
    loaders/SearchNotes.ts
    components/NoteEditor.ts  // NoteEditor and its SaveNote command
    components/NoteActivity.ts
    components/ActivityLog.ts
    components/NoteLinkPicker.ts
  pages/
    NotesIndex.ts             // /
    notes/NotePage.ts         // /notes/:id
    search/SearchPage.ts      // /search
  server/NotesApi.ts          // the JSON API that Notes calls
```

A second feature is a sibling of `notes/`, with its own `domain`, `services`,
`loaders` and `components` folders. Pages import features, but features never
import pages. Keep `AppRoute` in `routes.ts`, outside `pages/` and separate
from `App.ts`; pages can then build links without importing the root component
that imports them.

Keep one file per route in `pages/`, in folders that mirror the URL. A page's
folder is the static segments of its route's path, and its file is named after
the component. `/` is `pages/NotesIndex.ts`, `/notes/:id` is
`pages/notes/NotePage.ts`, and `/notes/:id/history` would be
`pages/notes/history/NoteHistoryPage.ts`. A param segment gets no folder. The
folder follows the URL, not the feature the page uses.

A command belongs in the file of the component that runs it, not in a shared
`commands/` folder. When two components need the same write, share the service
method and give each component its own command. Loaders have their own folder
because pages, multiple components and server rendering all read them.

A component provides the domain Layers it needs in its own file, with
`Component.provide`: its commands, its loaders and the services they capture.
The plain name, such as `NotePage`, is the component with those Layers
provided, and it is the one parents and entry modules use. The component
without them is exported as `NotePageNoDeps`, for a test that provides its
own. A component that needs no domain Layers has only the plain name.

A memoised Layer is built once per Env, the services a component resolves
from. Provides that resolve from the same Env share it, and so do the provides
below them. It is closed when its last user unmounts. Components under
different provided ancestors each build their own copy, so a service built for
one page never sees another page's dependencies. A service that holds state,
such as a session or a sync engine, is provided by the component that owns its
lifetime, usually the root component. The components below keep naming it in
their own provides and get that instance.

Entry modules sit beside these folders. Each one imports
`effect/ui/html/register` before it renders anything, and provides only
platform Layers such as the Router, the HTTP client and logging. Domain Layers
are never provided there. The server and a test of the whole app swap the HTTP
client, not the services.
