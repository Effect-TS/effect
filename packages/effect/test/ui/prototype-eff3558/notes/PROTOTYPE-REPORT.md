# EFF-3558 prototype report

Code (all under `effect/packages/effect/test/ui/prototype-eff3558/`):

- `app.ts` (346 lines): the app. Two reads, two mutations, five components.
- `api.ts` (160 lines): the `UsersApi` service and its in-memory fake. The fake does its work when a call arrives and answers after 10 ms, or when the test releases it.
- `prototype.test.ts` (15 tests): the experiments. Each test name quotes the ticket line it answers.

Run from the repo root:

```sh
nix develop -c pnpm vitest run --project effect packages/effect/test/ui/prototype-eff3558
nix develop -c pnpm exec tsc --noEmit -p tsconfig.eff3558-ui.json
```

15 of 15 pass, and the whole of `test/ui` is 232 of 232. tsc, oxlint and dprint are clean on the three files. I changed nothing under `src`. Four tests carry `[SURPRISE]` in their name: they assert what happens, and what happens is bad for users or needs a rule the resolutions don't give.

Frames below are every commit the host saw, with repeats dropped. `card X` is the detail card's heading, `input X` the rename field, `♥ n` the like button, `Updating…` is `waiting: true` on the card and `Saving…` the form's own counter.

## What the app is

`App` holds the route. `ListPage` shows a page of 20 users with Previous/Next and a "Peek" button per row that opens a `UserCard` under the list. `DetailPage` shows the same `UserCard` and, behind a "Rename" button, a `RenameForm`. `UserCard` and `RenameForm` each watch `GetUser({ id })`, so the card on the list, the card on the detail page and the form share one entry. `RenameUser` is `queue` mode keyed by id, patches `GetUser` and every `ListUsers` page, writes its result to `GetUser` and invalidates `ListUsers`. `LikeUser` patches `likes + 1` and invalidates the `users` tag both reads carry.

## Ticket items

### Derived draft, refetch on focus mid-edit (EFF-3553)

Works as designed. With "Ada L" typed, another client's rename, 31 s hidden and a visibility edge:

```
card User 1 | ♥ 1 | input Ada L
card User 1 | ♥ 1 | input Ada L | Updating…
card Renamed elsewhere | ♥ 1 | input Ada L          fetch trigger: visibility
card Renamed elsewhere | ♥ 1 | input Renamed elsewhere   after Cancel
```

The pattern costs one `Option` field and one `Option.getOrElse` in the view. See "API feel" for the part I got wrong first (what happens to the draft when the save fails).

### SSR `state` payload size (EFF-3553)

20 users of 8 fields per page, measured on `ssr()`'s payload:

| Page | payload | Models | `~loader` | one copy of the value | HTML |
| --- | --- | --- | --- | --- | --- |
| list | 9,115 B | 6,082 B | 2,998 B | 2,943 B | 2,121 B |
| detail | 549 B | 315 B | 195 B | 140 B | 444 B |

The detail page ships its user twice, as F-I4 said. The list page ships its page three times, because "keep previous page" needs two bindings and each holds a snapshot. The list payload is 4.3 times its HTML. Gzipped it is 695 B against 494 B for one copy, so on the wire the copies are nearly free. Two caveats on that number: my seeded data is repetitive and compresses far better than real data would, and gzip only removes a repeat that starts within 32 KB of the first copy. The uncompressed size is still what the client parses and what the Models hold in memory. No fetch ran on the client for either page.

### Cost of `open` encoding args on every render (EFF-3554)

100,000 calls each, after a 10,000 call warm-up, on this machine:

| args | `open` | `JSON.stringify` of the same args |
| --- | --- | --- |
| `{ id }` | 0.9 us | 0.08 us |
| 8 fields, two arrays, one struct | 7.1 us | 0.5 us |

`open` is about 12 times a plain stringify, and it doesn't matter. A view opens one or two bindings per render. A hundred opens of the large args is 4% of a 16.7 ms frame. `watch` pays the same on every `subscriptions()` call. No memo is needed.

### "Keep previous page" with two bindings (EFF-3554) [SURPRISE]

It works on screen, with a condition. Next, Next, Previous, with the fake holding each answer:

```
Loading users…                                          {shown opens as Initial waiting}
rows User 1..User 20 | Page 1 of 3                      {shown opens as Success}
rows User 1..User 20 | Page 1 of 3 | Loading page 2…    {shown opens as Success}
rows User 21..User 40 | Page 2 of 3                     {shown opens as Initial waiting}
rows User 21..User 40 | Page 2 of 3                     {shown opens as Success}
...
```

The user never sees "Loading users…" again after the first load, and going back to page 2 used the cache (3 fetches for 3 pages). But on the frame where the requested page arrives, `update` moves `shownPage` forward, the "shown" snapshot is still the old key, and `shown.open` returns Initial for one commit until its own watch delivers. The app only avoids a flash because its view reads "requested" when that is a Success and falls back to "shown" otherwise. A view that renders from "shown" alone, which is how I would read the words "requested" and "shown", flashes one frame at every page change. The type brand rightly stops `update` from copying the "requested" snapshot into the "shown" field, so there is no way to hand the value over in the same update.

### Patch reaches watchers before the flush (EFF-3555)

True. With the list and the detail page mounted side by side, the submit produced these updates synchronously with zero commits in between: `RenameForm Save`, `UserCard UserChanged`, `RenameForm UserChanged`, `ListPage RequestedChanged`, `ListPage ShownChanged`. The first frame after it:

```
rows Ada..User 20 | Page 1 of 3 | card Ada | ♥ 1 | input Ada | Updating… | Saving…
rows Ada..User 20 | Page 1 of 3 | card Ada | ♥ 1 | input Ada
```

The list row (through `patchAll`) and the card show "Ada" in the same frame as "Saving…". After the answer only `ListUsers` was refetched, because `writes` covered `GetUser`.

### Issue-site shape (EFF-3555)

`Command.match` as the branch ended (F-C2). In the app it reads fine: `RenameUser.make(id, name).pipe(Command.match({ onSuccess, onFailure }))`. `Command.map` on `RenameUser` is a compile error, as is `$.run` with no mapping at all. `LikeUser` can't fail and uses `Command.map`. One wart: a mutation whose result the component doesn't care about still needs a message variant and a no-op branch (`Liked: () => model`).

### Four cases (EFF-3555)

**Two queued saves of one field.** Good. One request leaves, the second waits in the queue, and the screen goes B, C and stays on C while B is answered:

```
card B | ♥ 1 | input B | Updating… | Saving…
card C | ♥ 1 | input C | Updating… | Saving…
card C | ♥ 1 | input C
```

Both results were written, so nothing was refetched.

**Save then unmount.** [SURPRISE] Bad in three ways. I saved B, then C (queued), then navigated to the list while B was in flight.

```
on the list after leaving:
  Loading users…
  rows User 1..User 20 | Page 1 of 3
  rows B..User 20 | Page 1 of 3
back to the detail page:
  card C | ♥ 1 | input C | Saving…
  card User 1 | ♥ 1 | input User 1 | Updating… | Saving…
  card B | ♥ 1 | input B | Saving…
```

1. The write is lost. Both runs end with their instance. The request for B had left and the fake applied it, so the server holds B. The save of C was still queued and never left: `rename` was called once. Nobody is told, because the instance that would get `SaveFailed` is gone. A real aborted request may or may not have been applied.
2. The list shows the old name first. The patches come off at the interrupt, so the list renders "User 1", then "B" when the invalidation's refetch lands.
3. Going back shows three names and a "Saving…" that never clears. The Model saved at the push holds the optimistic "C" (EFF-3557 #25 predicted that) and `saving: 2`. Then the cache's entry, last fetched before either save, replaces it with "User 1". Then the refetch brings "B". No Command is running, so `saving` stays at 2 for good.

**`count + 1` with a `Loader.Visibility` edge.** Good. The entry was stale, the like was counted by the server and not yet answered, and the tab lost and regained focus. The edge's fetch waited for the mutation (1 `get` call, not fetching, 1 patch), then ran once with trigger `visibility`. Frames: `♥ 2 | Updating…`, `♥ 2`. No frame shows 3.

**Two concurrent renames answered out of order.** [SURPRISE] It ends right and looks wrong on the way. Two forms (two queues), B then C arrive, the server holds C, C is answered first:

```
card B | Updating… | Saving…
card C | Updating… | Saving… | Saving…
card C | Updating… | Saving…          C answered and written
card B | Updating…                    B answered: written over C, stored stale, refetch starts
card C                                refetch
```

The late answer B is stored and shown for the length of a round trip. The cache knew the write was out of date (it stored it stale and refetched), so it had what it needed to not show it.

### Route A to route B on a stale shared entry, and a child joining (EFF-3556)

Both hold. List page with user 1's card open, 31 s later, navigate to `/users/1`: the watcher count is 1 before and after, `get` is called a second time, trigger `watch`. Then 31 s later the rename form mounts on the entry the card watches: 2 watchers, stale, not fetching, still 2 `get` calls.

The frames are the surprise:

```
route A -> route B:   Loading user…  |  card User 1 | Updating…  |  card User 1
child joining:        Loading… | card User 1  |  card User 1 | input User 1
```

### An instance that starts watching a warm entry commits "Loading" first [SURPRISE]

Not a ticket line, but it showed up in most experiments. Every new instance renders once from `init` (Initial, waiting) before the watch's first emission arrives, even when the entry is in the cache and fresh. Detail page of a cached user: "Loading user…" then the card. Back to the list by a push: "Loading users…" then the rows. Opening the rename form: "Loading…" then the form. No fetch is involved.

On TestHost that is one extra commit. On a real `BrowserHost` it is worse than an extra commit: the flush is a microtask, but the cache defers the first emission with `Effect.yieldNow` on the default scheduler, which is `setTimeout(0)` in a browser. The second test drains 50 microtasks after the click and the DOM still says "Loading…" with no form, so the browser is free to paint it. This comes from Loader finding 1 (the callback is never invoked inside registration, the first emission is one scheduler step later). History restore is not affected, because the restored Model already holds the snapshot.

### Per-push `history.state` size (EFF-3557)

| Leaving | bytes |
| --- | --- |
| the list page (20 users) | 6,106 B, of which 5,886 B is the page twice |
| the list page with a card open | 6,331 B |
| the detail page (card and open form) | 631 B |

There is no `~loader` here, so the value is stored once per binding: twice for the list (two bindings), twice for the detail page (card and form). Far below any browser limit at this size. It grows linearly with rows times fields times bindings.

### Cold restore both ways (EFF-3557)

As EFF-3557 #24 describes. Detail page, push to the list, 2 minutes with `idleTimeToLive: "1 minute"` (the entry is gone), back.

```
fetch succeeding:   card User 1 | ♥ 1   ->   card Renamed since | ♥ 1
fetch failing:      card User 1 | ♥ 1   ->   This user doesn't exist.
```

First frame in both: the saved data, no "Updating…" (`waiting: false`), one fetch in flight (`fetching: true`, trigger `watch`), and `peek` on the cache is `Initial`. On failure the view goes to a Failure whose `previousSuccess` is None, so the data that was on screen can't be kept next to the error.

## API feel

I wrote `app.ts` once, it type-checked on the first run apart from an unused import, and it worked on the first mount. The compiler caught every wiring mistake I tried on purpose. The surface is learnable. What follows is where it cost more than it should or let a mistake through.

### What one read costs

`UserCard` reading `GetUser`, beyond the read's own declaration (10 lines, once per app):

| Place | Lines |
| --- | --- |
| Model field `user: Loaded.Snapshot(GetUser, "user")` | 1 |
| message variant `UserChanged: { snapshot: Loaded.Snapshot(GetUser, "user") }` | 1 |
| binding `Loaded.at(GetUser, "user", (model, props) => ...)` | 3 |
| `init`: `user: cardUser.empty` | 1 |
| `update` branch | 1 |
| `watch` in `subscriptions` | 3 |
| `open` in the view, then `AsyncResult.match` with three arms | 1 + 3 arms |

Seven places and about eleven lines, and the pair `(GetUser, "user")` is written three times. To write the binding I also had to hoist the Model schema into a const to name its type, and write the props type by hand next to the props Schema. The list page with two bindings pays all of it twice, plus a `shownPage` number and the promotion logic.

### What one mutation costs

`RenameUser`: 18 lines of declaration. At the issue site: 2 message variants (`Saved`, `SaveFailed`), 2 `update` branches, 6 lines for `make` + `Command.match`, and a `saving` counter in the Model with a `+ 1` and two `- 1`. `LikeUser`: 8 lines of declaration, 1 message variant that carries nothing, 1 branch that does nothing, 1 line to issue.

### Where I had to think, or got it wrong first

1. **What to do with the draft when the save fails.** "Cleared on save" at issue means a failed save has thrown the user's text away by the time `SaveFailed` arrives, and the patch has rolled the name back. I ended up carrying the attempted name in `SaveFailed` and restoring the draft from it. The pattern as written in EFF-3553 #6 doesn't say this.
2. **`saving` as a boolean.** My first version. It is wrong with a `queue` Command: the first `Saved` clears it while the second save runs. It became a counter. Then the unmount experiment showed the counter is wrong too, because it goes into `history.state` and comes back with no Commands behind it.
3. **Two "pending" signals that overlap.** A live patch shows as `waiting: true`, and so does a background refetch. During a save the card says "Updating…" and the form says "Saving…". From the snapshot alone a view can't tell "my optimistic value" from "refreshing".
4. **The `RequestedChanged` branch.** To know whether to promote `shownPage` I have to `open` the incoming snapshot inside `update`, with the next Model. It is the one place where `update` opens a snapshot, and using the old Model there compiles.
5. **Which binding the view renders.** See "keep previous page".
6. **`invalidates` when `writes` and patches already cover it.** I wrote `invalidates: () => [ListUsers]` and wasn't sure it was needed, since a `patchAll` already implies the read. It is redundant. `invalidates` being required while often redundant invites cargo-cult targets.
7. **Tag or read.** `LikeUser` invalidates the `users` tag, `RenameUser` names the read. Both work. I had no reason to pick one.
8. **Where the read Layers go.** I exported one merged `layer` and provide it at the mount. I did not try `Component.provide` on the layout, which is what EFF-3554 #8 recommends. That path is untested here.
9. **Three ways to reach props**: `$.props` in `update`, `h.props` in the view, a parameter in `subscriptions`. Not new, but a binding makes you pass props in all three.
10. **Test harness**: mounting `App` with a `route` prop while the Router's history is at another URL silently shows the Router's page. Cost me one run.

### Mistakes that compile

- A snapshot field with no watch: loads forever. The dev check from EFF-3553 #7 isn't implemented.
- A view that reads "shown" only: one-frame flash.
- Promoting `shownPage` without checking the requested snapshot is a Success: flash.
- `saving` as a boolean, or any in-flight flag in a Model that survives a history restore.
- Clearing the draft at issue and not restoring it on failure.
- Omitting `writes`: correct, one extra fetch. Omitting the `patchAll`: the list row is stale until the refetch.
- An `onInitial` arm that says "Loading": correct, and shown for a frame on every mount over a warm entry.

Mistakes that don't compile, which I checked: opening a "requested" snapshot with the "shown" binding, storing one in the other's field, a label typo between field and binding, `Command.map` on a Command that can fail, `$.run` with no mapping, a read without `staleTime`, a Command without `invalidates`, a `set` with the wrong value type.

### What an AI agent would most likely get wrong

In order of likelihood: the boolean `saving`; losing the draft on a failed save; rendering "keep previous" from "shown" only; forgetting the watch for a field it added (the three other places make the compiler happy); adding `invalidates` targets "to be safe" that refetch what `writes` just stored. All five compile and four of them pass a happy-path test.

## The ticket's questions

**Is seeding the cold entry as stale needed?** Recommendation: yes. The succeeding case is fine as it is; the only thing missing is an "Updating…" cue. The failing case is the reason: a page the user was reading turns into a bare error with nothing to fall back on. For a real 404 that is right, but the typed failure channel is also where an app puts "the network is down", and there the old data should stay with the error next to it. Seeding gives `waiting: true` on the first frame and a Failure with `previousSuccess`. One caveat from the unmount case: a snapshot saved under a live patch holds an optimistic value, and seeding it would put a value the server never had into the cache. The snapshot would need to store the unpatched value, or a seeded entry must never survive as `previousSuccess` of a Failure.

**Does "keep previous page" work with two bindings?** It can be made to work, and it is the most error-prone code in the app. It needs two fields, two message variants, two branches, two watches, a second page number, promotion logic in `update` and a fallback order in the view, and the obvious view flashes. It also triples the list's SSR payload and doubles its `history.state`. Recommendation: give the binding a "keep previous" form (EFF-3554 #12 left it for later) so that `open` on a changed key returns the last Success with `waiting: true`. Until then the docs need this exact recipe.

**Is the payload size acceptable, or is "Models reference entries" needed?** Acceptable for a first draft with one binding per read (2x, and gzip hides most of it). With the two-binding pattern it is 3x uncompressed and 4.3 times the HTML it renders, which I would not ship as the documented way to page a list. Recommendation: do "Models reference entries" for SSR (about 3.2 KB instead of 9.1 KB here, 65% less), since the snapshot owns its encoding. It does nothing for `history.state`, which has no `~loader` to point into.

## Other recommendations

These are recommendations, not decisions.

1. **Deliver the first emission of a settled entry before the instance's first render.** `WatchHandle.current()` already gives the sync read. Either the runtime applies it as the instance's first message inside mount, or the cache's defer uses the runtime's executor so it lands before the flush. This removes the "Loading" frame on every warm mount and the one-frame Initial in "keep previous".
2. **Don't display a write the cache already knows is out of date.** In the out-of-order case the write is stored stale and refetched at once. Skipping the store (keeping the newer value, marked stale) gives C, C, C.
3. **Decide what a mutation does when its instance unmounts.** Today "save, then navigate" interrupts the request and drops queued saves silently. Options: let runs of a `Command.Service` with `invalidates`/`writes` outlive the instance (the cache already owns their patches), or block navigation while one is queued. At minimum the docs must say that a save doesn't survive leaving the page.
4. **Give the view a way to tell a live patch from a refetch**, or stop reporting a live patch as `waiting`.
5. **In-flight state in a Model and history restore.** A counter or flag that tracks a Command is restored without the Command. Either the runtime exposes "this instance has a run of X" to the view so the Model needn't hold it, or the snapshot written at a push should be taken in a way that can't capture it. This predates the Loader, but optimistic saves make every app hit it.
6. **TestHost needs a frame recorder.** Every experiment here wraps `host.commit` by hand. `root.frames()` or an `onCommit` option would do. Input for EFF-3559.

## Not done

- No real browser. The paint claim rests on the BrowserHost test in happy-dom (the DOM still shows "Loading…" after the microtask queue drains) and on reading `Scheduler.ts`.
- `Component.provide` for the read Layers, `refetchInterval`, `Loader.Connectivity`, `static: true`, and `get`/`prefetch` from a Command were not used by the app.
- The page lives in the list's Model, not the URL. With the page in the route the layout must not key the list by the printed route, or "keep previous" is lost on every page change. Not tested.
- The gzip numbers use seeded, repetitive data.
