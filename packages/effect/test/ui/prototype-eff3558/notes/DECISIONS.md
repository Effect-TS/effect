## Resolution

Built as a rough but real implementation on #10483's head, reviewed with Architect (Effect Bot), who read the branch and ran one test of its own, then confirmed by Tim in chat, who also made the three calls left for him. This replaces the two draft comments above.

The prototype is the throwaway branch `agent/jarvis/564861001bcf`, never to be merged: https://github.com/Effect-TS/effect/tree/agent/jarvis/564861001bcf/packages/effect/test/ui/prototype-eff3558. `app.ts` is the app, `prototype.test.ts` has the 15 experiments, and `notes/` holds the report and findings attached to the first comment. The branch still says `Loaded` and still has the behaviour the decisions below change. It was not run in a real browser.

### Verdict

The API holds up in real code. The app type-checked and worked on the first mount, and the compiler caught every wiring mistake tried on purpose. One read costs seven places and about eleven lines. These held as written: the derived draft across a visibility refetch, a patch reaching every watcher before the issuing flush, two queued saves, `count + 1` across a `Loader.Visibility` edge, and the zero-to-one rule on route A to B.

### Decisions

1. **The module is `effect/ui/LoaderBinding`** (Tim), not `Loaded`.
2. **The first emission is synchronous.** The cache never calls back for the state at registration. The runtime reads the handle's current value and folds it through `update` before that instance's next render, on mount and on re-key, on client and server. Commands from those messages are issued where `init`'s are, after the first render. An adopting instance renders the server's Model first and gets the emission right after, in the same flush. Registration becomes parent before child. An instance whose own Layer is still building still commits Initial. Without this, every new instance painted one "Loading" frame over a warm entry.
3. **"Keep previous page" is `binding.previous(snapshot, model, props)`.** `open` stays strict. `previous` returns the stored Success only when the snapshot's key differs from the current args and the read is enabled. One field and one watch. The two-binding recipe is not documented: its obvious view flashes and it ships the list three times.
4. **Issue site.** `RenameUser.make(id, name).pipe(Command.match({ onSuccess, onFailure }))`. A body that can fail returns `Command.Unmatched`, which `$.run` and `Command.map` reject. A body that can't fail uses `Command.map`, and `match` on it is an error. The trailing-handlers sketch breaks on optional arguments.
5. **`Command.Service` options are their own type parameter**, so callbacks never infer the body's args. `writes` is Effect-only, and a Stream Command rejects it.
6. **A mutation is owned by the Layer build that provides its service** (Tim), like a fetch. This holds for Effect-shaped `Command.Service` runs. The queue drains after the instance is gone, the result message is dropped, and the cache still gets patch removal, `writes` and invalidation. `switch`, `Command.interrupt`, Stream Commands and `Command.make` still end with the instance. The docs rule is the one reads have: provide the mutation at the layout that outlives the route.
7. **`waiting` means only that a fetch is in flight** (Tim). A second in-memory flag on the binding says the value includes an unconfirmed patch. Under a live patch only the second is true, and through the confirming refetch both are. It is not a field on `AsyncResult`. Its name is the spec's to pick.
8. **A cold entry is seeded as stale on history restore** (Tim), through the snapshot codec. It only seeds a cold entry and never from a snapshot taken under a patch, so the flag from decision 7 is written into `history.state`. The first frame has `waiting: true`, and a failed refetch keeps the data as `previousSuccess`.
9. **Out-of-order writes.** A write is skipped only when a run issued later has already reached the entry, compared by issue order. Every other not-fresh write is stored stale.
10. **A held patch on an unwatched entry stays** until the next fetch on it settles, a write is stored, or the entry is collected. It doesn't block idle collection. Otherwise a rename on the detail page shows the old name on the list for a round trip after going back.
11. **The args key is canonical JSON and parseable.** Building a key throws on a non-JSON leaf, which is also the "unsound encodings are rejected" check. Args are recovered with `JSON.parse` and the args codec, so a hydrated entry has its args with no wire change.
12. **A reverted interval fetch re-arms its timer.**
13. **Smaller rules the code needed.** Storing a write restarts a fetch in flight. Only a write stored fresh is excluded from its run's own invalidation. A Failure with `previousSuccess` stays when the last watcher leaves. A restarted fetch's trigger event carries `restart: true`. A read's fake built with `Layer.succeed` has no build scope, so its fetches live as long as the cache.
14. **The watcher count drops in a pre-pass of the patcher**, before any new instance is created.

### Numbers

|                          | List page (20 users)      | Detail page |
| ------------------------ | ------------------------- | ----------- |
| SSR `state`              | 9,115 B with two bindings | 549 B       |
| One copy of the value    | 2,943 B                   | 140 B       |
| `history.state` per push | 6,106 B                   | 631 B       |

With decision 3 the list ships its page twice, not three times. `open` costs 0.9 to 7.1 microseconds, so it needs no memo.

### Not covered

No dev-mode check was built, including "a snapshot field with no watch", and whether that one works for snapshots nested in unions is still unverified. `Component.provide` for read Layers, `refetchInterval`, `Loader.Connectivity` and `static: true` were not used by the app.

### Requirements handed on

- **Testing with a cache** (EFF-3559): the prototype's harness, listed on that ticket.
- **get on an entry with a live patch** (EFF-3569): the prototype did "fetch for the caller, store nothing", and the same on a held entry, where joining the confirming fetch would save a request.

### Spec changes

- §5: `Command.match` and `Unmatched`. Effect-shaped `Command.Service` runs are owned by the providing Layer build. This reverses decision 19 of Mutations, invalidation and optimistic updates (EFF-3555), and decision 7 here reverses its decision 20. Decisions 9 and 10 amend its decisions 15 and 10.
- §6: the first emission is synchronous, which drops "emits through `defer`" from decision 11 of SSR, hydration and history restore with a cache (EFF-3557). The patcher's pre-pass drops watchers.
- §12.4: the cold restore seeds, reversing decision 24 of EFF-3557.
- `LoaderBinding` gains `previous` and the patched flag, amending decision 12 of The read primitive and where the core lives (EFF-3554). Its decision 3 becomes "the key is canonical JSON".

## Addendum: loaders are declared in `Component.make`

Settled with Tim in chat after the resolution above. It replaces decision 1 there (`effect/ui/LoaderBinding`) and the `Loaded.at` binding from The read primitive and where the core lives (EFF-3554). Only the types were checked, against `Component.make`'s real ten type parameters, in `reads-sketch.ts` on the prototype branch. Nothing here is implemented.

```ts
Component.make({
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: Loader.Snapshot(GetUser, "user"), n: Schema.Number }),
  message: Message,
  loaders: {
    user: (_model, props) => ({ id: props.id })          // undefined = disabled
  },
  init: ($) => ({ ...$.empty, n: 0 }),
  subscriptions: (_model, _props, watch) => [
    watch({ user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) })
  ],
  view: (_model, h) => AsyncResult.match(h.loaded.user, { ... })
})
```

### Decisions

1. **A `loaders` field on `Component.make`** (Tim) maps each snapshot field of the Model to its args function. There is no module-level binding and no `effect/ui/LoaderBinding` module. The Model and props Schemas are written once and nothing is annotated. This partly reverses decision 7 of Data in the Model or read from the cache (EFF-3553). It generates nothing: the message variant, the `update` branch and the watch stay hand-written.
2. **The snapshot Schema is `Loader.Snapshot(read, label)`** (Tim), in `effect/reactivity/Loader`. The prototype's snapshot code imports nothing from effect/ui, so it can live there. This amends decision 1 of EFF-3554, which said the core has no snapshot type.
3. **`subscriptions` gets a third argument, `watch`**, which takes one handler per snapshot field and returns a branded Subscription. When the Model has snapshot fields, `loaders` and `subscriptions` are required and `subscriptions` must start with the watch.
4. **The view reads `h.loaded.<field>`**, an `AsyncResult`, and `init` spreads `$.empty`. Neither takes the Model or props. `h.loaded` is my proposed name and Tim hasn't confirmed it. `previous` and the patched flag from the resolution above sit beside it on `h`.

### What becomes a type rule

A snapshot field with no loader, no watch or no handler, and args that don't match the read, are compile errors. A watch and a view with different args, a conditional watch for one field, two watches with one label, a watch with no snapshot field and a snapshot opened through another binding can no longer be written. Their dev checks go. A snapshot nested in a union or array has no loader key, so it can't be bound.

### Open

- The snapshot brand is lost through a message constructor: `Message.make({ _tag: "PageChanged", snapshot })` accepts a user snapshot. The snapshot Schema needs a typed make input.
- The label now repeats the field name. Keep it for the brand and check it equals the field name, or find another brand.
- `h.loaded` wasn't checked for clashes with element names in a vocabulary.
  Tim confirmed the name `h.loaded` for the view side, so decision 4 of the addendum above is settled. Still unchecked: whether `loaded` clashes with an element name in a vocabulary.
