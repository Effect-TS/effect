# EFF-3558 prototype report

Second pass: the prototype now follows `DECISIONS.md` end to end. The first report's frames and numbers are replaced by the ones below.

## What changed since the first prototype

| Decision                                        | Before                                                                                                                        | After                                                                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2. First emission is synchronous                | Every new instance over a warm entry committed one "Loading" frame. On BrowserHost it outlived the microtask queue.           | No "Loading" frame on mount or re-key over a warm entry, on TestHost and on BrowserHost (happy-dom). Commands from the folded message start after `init`'s. The server's "awaited emissions" bookkeeping is gone. |
| 3. `h.previous.<field>`                         | Two snapshot fields, two variants, two watches, a second page number, promotion logic. 11 frames for Next, Next, Previous.    | One field, one variant, one watch. 7 frames. The page is in the SSR payload twice, not three times.                                                                                                               |
| 6. Mutations are owned by the Layer build       | Save then leave: the queued save was lost, the list showed the old name, going back showed three names and a stuck "Saving…". | Both saves reach the server, the list shows the new name throughout, going back shows the saved name. The result message is dropped.                                                                              |
| 7. `waiting` is fetch-only, `h.patched.<field>` | A live patch and a refetch were both `waiting: true`.                                                                         | The card says "Updating…" only on a real fetch. The form says "Saving…" from `h.patched.user`.                                                                                                                    |
| 8. Cold restore seeds stale                     | First frame had `waiting: false`. A failed refetch gave a bare Failure.                                                       | First frame has `waiting: true`. A failed refetch keeps the data as `previousSuccess`. A snapshot taken under a patch seeds nothing.                                                                              |
| 9. Out-of-order writes                          | The older answer B showed for one round trip.                                                                                 | B is never shown again once C is on screen.                                                                                                                                                                       |
| 10. Held patch on an unwatched entry            | Not measured.                                                                                                                 | Rename on detail, success, back: the list shows the new name in its first frame.                                                                                                                                  |

| Number                                   | Before  | After          |
| ---------------------------------------- | ------- | -------------- |
| SSR `state`, list page                   | 9,115 B | 6,112 B        |
| SSR `state`, detail page                 | 549 B   | 549 B          |
| `history.state`, leaving the list        | 6,106 B | 3,114 B        |
| `history.state`, leaving the detail page | 631 B   | 620 B          |
| `open`, `{ id }` args                    | 0.9 us  | 1.5 to 2.7 us  |
| `open`, large args                       | 7.1 us  | 7.5 to 11.9 us |

Code (all under `effect/packages/effect/test/ui/prototype-eff3558/`):

- `app.ts` (328 lines): the app. Two reads, two mutations, five components.
- `api.ts` (160 lines): the `UsersApi` service and its in-memory fake. Unchanged.
- `prototype.test.ts` (16 tests): the experiments. Each test name quotes the ticket line it answers.

Runtime tests for the decisions themselves are in `test/ui/Loaded.test.ts` (20 tests) and `test/ui/html/LoadedSsr.test.ts` (10 tests).

Run from the repo root:

```sh
nix develop -c pnpm vitest run --project effect packages/effect/test/ui packages/effect/test/reactivity/Loader.test.ts
nix develop -c pnpm exec tsc --noEmit -p tsconfig.eff3558-ui.json
nix develop -c pnpm exec tsc --noEmit -p tsconfig.eff3558-loader.json
```

270 of 270 pass. Both tsc projects, oxlint and dprint are clean, and `typetest/ui/Loaders.tst.ts` passes. This pass changed `src`: `ui/internal/runtime.ts`, `ui/internal/loaders.ts`, `ui/Command.ts`, `ui/Component.ts` and `reactivity/internal/loaderSnapshot.ts`. `reactivity/Loader.ts` was not touched. No test in `prototype.test.ts` carries `[SURPRISE]` any more. Two tests in `Loaded.test.ts` do, both about decision 6 (see "Save then unmount" and FINDINGS F-R3, F-R4).

Frames below are every commit the host saw, with repeats dropped. `card X` is the detail card's heading, `input X` the rename field, `♥ n` the like button. `Updating…` is `waiting: true` on the card. `Saving…` is `h.patched.user` on the form.

## What the app is

`App` holds the route. `ListPage` shows a page of 20 users with Previous/Next and a "Peek" button per row that opens a `UserCard` under the list. `DetailPage` shows the same `UserCard` and, behind a "Rename" button, a `RenameForm`. `UserCard` and `RenameForm` each watch `GetUser({ id })`. `RenameUser` is `queue` mode keyed by id, patches `GetUser` and every `ListUsers` page, writes its result to `GetUser` and invalidates `ListUsers`. `LikeUser` patches `likes + 1` and invalidates the `users` tag both reads carry.

Final signatures the app uses:

```ts
// view
h.loaded.<field>    // AsyncResult<Success, Error>, strict: Initial when the snapshot's key isn't the current args
h.previous.<field>  // Option<Success>: Some only when the snapshot's key differs from the current args and the loader is enabled
h.patched.<field>   // boolean: the value includes an unconfirmed patch. In memory, plus one bit in history.state
h.props

// init / update
$.empty             // every snapshot field, empty
$.loadedOf(model)   // the same object as h.loaded, for a Model you name
$.props, $.set(model).run(command), $.run(command)

// outside a render, for tests
Component.loaded(model, props), Component.previous(model, props), Component.patched(model, props)
```

There is no `$.previousOf` or `$.patchedOf` (F-R5).

## Ticket items

### Derived draft, refetch on focus mid-edit (EFF-3553)

Unchanged, and still works as designed:

```
card User 1 | ♥ 1 | input Ada L
card User 1 | ♥ 1 | input Ada L | Updating…
card Renamed elsewhere | ♥ 1 | input Ada L          fetch trigger: visibility
card Renamed elsewhere | ♥ 1 | input Renamed elsewhere   after Cancel
```

### SSR `state` payload size (EFF-3553)

20 users of 8 fields per page, measured on `ssr()`'s payload:

| Page   | payload | Models  | `~loader` | one copy of the value | HTML    | payload gzipped |
| ------ | ------- | ------- | --------- | --------------------- | ------- | --------------- |
| list   | 6,112 B | 3,079 B | 2,998 B   | 2,943 B               | 2,121 B | 646 B           |
| detail | 549 B   | 315 B   | 195 B     | 140 B                 | 444 B   | 271 B           |

Both pages now ship their value twice: once in the Model's snapshot and once under `~loader`. The list payload is 2.9 times its HTML, down from 4.3. If Models referenced entries the list would be about 3,169 B (48% less). The gzip caveat stands: the seeded data is repetitive. No fetch ran on the client for either page.

### Cost of `open` encoding args on every render (EFF-3554)

100,000 calls each, after a warm-up, two runs on a loaded machine:

| args                             | `open`         | `JSON.stringify` of the same args |
| -------------------------------- | -------------- | --------------------------------- |
| `{ id }`                         | 1.5 to 2.7 us  | 0.08 to 0.14 us                   |
| 8 fields, two arrays, one struct | 7.5 to 11.9 us | 0.5 to 0.9 us                     |

The measurement is noisy and the small case is slower than the first report's 0.9 us, because a render context now carries three views (`loaded`, `previous`, `patched`). My first version of that cost 5.9 us for `{ id }`. Building the three prototypes once per component brought it back down. A hundred opens of the large args is 4.5 to 7.1% of a 16.7 ms frame. Still no memo needed.

### "Keep previous page" with one field and `h.previous` (EFF-3554)

Next, Next, Previous, with the fake holding each answer:

```
Loading users…                                          {loaded Initial waiting, previous None}
rows User 1..User 20 | Page 1 of 3                      {loaded Success, previous None}
rows User 1..User 20 | Page 1 of 3 | Loading page 2…    {loaded Initial waiting, previous Some(page 1)}
rows User 21..User 40 | Page 2 of 3                     {loaded Success, previous None}
rows User 21..User 40 | Page 2 of 3 | Loading page 3…   {loaded Initial waiting, previous Some(page 2)}
rows User 41..User 45 | Page 3 of 3                     {loaded Success, previous None}
rows User 21..User 40 | Page 2 of 3                     {loaded Success, previous None}
```

Seven frames, down from eleven. There is no frame where the shown data opens as Initial, so no view can flash. Going back to the cached page 2 commits no "Loading page 2…" frame at all: decision 2 folds the cached value before the render. 3 fetches for 3 pages. The Model holds the page once.

The view is:

```ts
const current = h.loaded.users
if (AsyncResult.isFailure(current)) return h.p("The users couldn't be loaded.")
const shown = AsyncResult.isSuccess(current) ? Option.some(current.value) : h.previous.users
```

"Loading page N…" is `model.page !== page`, comparing the requested page with the one in the shown value.

### Patch reaches watchers before the flush (EFF-3555)

Still true. The submit produced these updates synchronously with zero commits in between: `RenameForm Save`, `UserCard UserChanged`, `RenameForm UserChanged`, `ListPage UsersChanged`. Frames:

```
rows Ada..User 20 | Page 1 of 3 | card Ada | ♥ 1 | input Ada | Saving…
rows Ada..User 20 | Page 1 of 3 | card Ada | ♥ 1 | input Ada
```

No "Updating…": a patch alone is not a fetch. After the answer only `ListUsers` was refetched.

### Issue-site shape (EFF-3555)

Unchanged: `RenameUser.make(id, name).pipe(Command.match({ onSuccess, onFailure }))`.

### Four cases (EFF-3555)

**Two queued saves of one field.** Good, and the card no longer claims to be updating:

```
card B | ♥ 1 | input B | Saving…
card C | ♥ 1 | input C | Saving…
card C | ♥ 1 | input C
```

**Save then unmount.** Fixed by decision 6. Saved B, then C (queued), then navigated to the list while B was in flight.

```
on the list after leaving:
  rows C..User 20 | Page 1 of 3
back to the detail page:
  card C | ♥ 1 | input C
```

After leaving, `pending()` lists both runs (one running, one queued) under the form's old path, and the entry has 0 watchers and 2 patches. Releasing the first answer starts the second request with no instance mounted. `rename` was called twice and the server holds C. No `Saved` message reached anyone. The list never shows "User 1". Going back: the Model saved at the push was taken under a patch (its encoding ends in `,1]`), so it seeds nothing and is opened empty, and the cache's entry, which the saves wrote, is folded before the first render. One frame, no "Saving…".

What is still not good here is in "API feel": the app had to stop keeping `saving` in its Model.

**`count + 1` with a `Loader.Visibility` edge.** Good. Frames: `♥ 2`, `♥ 2 | Updating…`, `♥ 2`. The first frame is the patch alone. "Updating…" appears only when the edge's fetch starts, after the like was answered. No frame shows 3. 2 `get` calls.

**Two concurrent renames answered out of order.** Fixed by decision 9. Two forms, B then C arrive, the server holds C, C is answered first:

```
card B | Saving… | Saving…
card C | Saving… | Saving…
card C | Updating… | Saving… | Saving…     B answered: skipped, the confirming refetch starts
card C
```

B never comes back. Two things to know. Both forms say "Saving…" from the first save on, because `patched` is about the entry and not about who patched it. And both patches are held until the confirming refetch settles, so "Saving…" lasts one round trip longer than the saves.

### Route A to route B on a stale shared entry, and a child joining (EFF-3556)

Both hold, with the same counts as before (`get` called twice, trigger `watch`; the joining form fetches nothing). The frames lost their "Loading":

```
route A -> route B:   card User 1 | ♥ 1 | Updating…   ->   card User 1 | ♥ 1
child joining:        card User 1 | ♥ 1 | input User 1
```

### An instance that starts watching a warm entry (decision 2)

Fixed. Detail page of a cached user: the card, with no "Loading user…". Opening the rename form: the form, with no "Loading…". Back to the list by a push: the rows. On BrowserHost in happy-dom, a `MutationObserver` on the app from the click on never sees "Loading", and the form with its value is in the DOM once the click's microtasks have run.

In `Loaded.test.ts`: a new instance and a re-keyed one over a warm entry run `update` then `view`, once each. A Command issued by the folded update starts after `init`'s Command and after the first render (`update UserChanged`, `view Success`, `command init`, `command fold`). In `LoadedSsr.test.ts`: an adopting instance runs `view` (the server's Model), `update`, `view`. That second view is redundant (F-R8). Dependent reads still load in rounds on the server with the bookkeeping removed.

### The Architect flow (decision 10)

Rename on the detail page, wait for success, press back.

```
rows Ada..User 20 | Page 1 of 3
```

One frame. Before pressing back the list entry is unwatched, stale, holds the old page and still has the rename's patch (`patches: 1`); its invalidation fetched nothing because nobody watched. The history snapshot says "User 1". On back, the entry's patched value is folded over the restored snapshot before the render, the watch refetches (trigger `watch`), and the patch comes off when that fetch settles. No frame starts with "rows User 1".

### Per-push `history.state` size (EFF-3557)

| Leaving                              | bytes                                      |
| ------------------------------------ | ------------------------------------------ |
| the list page (20 users)             | 3,114 B, of which 2,943 B is the page once |
| the list page with a card open       | 3,339 B                                    |
| the detail page (card and open form) | 620 B                                      |

Half of before for the list. The patched bit adds 2 bytes to a snapshot, only when set.

### Cold restore both ways (EFF-3557, decision 8)

Detail page, push to the list, 2 minutes with `idleTimeToLive: "1 minute"`, back.

```
fetch succeeding:   card User 1 | ♥ 1 | Updating…   ->   card Renamed since | ♥ 1
fetch failing:      card User 1 | ♥ 1 | Updating…   ->   This user doesn't exist.
```

First frame in both: the saved data with "Updating…". The entry is `stale: true, fetching: true` and `peek` is a Success with `waiting: true`. On failure the result is a Failure whose `previousSuccess` holds "User 1". The app's card prints "This user doesn't exist." for any Failure, which is the app's choice: the data is there to show.

A snapshot pushed while a patch was live seeds nothing. On a cold cache the page then starts from "loading" (`Loaded.test.ts`). I also drop that snapshot from the restored Model, which the decision doesn't say (F-R7).

## API feel

The app got shorter (346 to 328 lines) and lost its two hardest parts: the two-field paging recipe and the `saving` counter. Nothing I changed in `app.ts` failed to type-check.

### What one read costs

`UserCard` reading `GetUser`, beyond the read's own declaration:

| Place                                                                         | Lines      |
| ----------------------------------------------------------------------------- | ---------- |
| Model field `user: Loader.Snapshot(GetUser, "user")`                          | 1          |
| message variant `UserChanged: { snapshot: Loader.Snapshot(GetUser, "user") }` | 1          |
| `loaders: { user: (_model, props) => ({ id: props.id }) }`                    | 3          |
| `init: ($) => $.empty`                                                        | 0 or 1     |
| `update` branch                                                               | 1          |
| `watch` in `subscriptions`                                                    | 3          |
| `h.loaded.user` in the view, then `AsyncResult.match` with three arms         | 1 + 3 arms |

Six places and about ten lines. `(GetUser, "user")` is written twice. No hoisted Model type, no hand-written props type. The list page pays this once, plus three lines for `h.previous`.

### What one mutation costs

`RenameUser`: 17 lines of declaration. At the issue site: 2 message variants, 2 `update` branches, 6 lines for `make` + `Command.match`. No counter in the Model. One line in the view: `h.patched.user && h.small("Saving…")`. `LikeUser` is unchanged: 8 lines, one empty variant, one no-op branch.

### Where I had to think, or got it wrong first

1. **`saving`.** The brief says to keep it honest. With decision 6 the run outlives the form and the result message is dropped, so a flag set at issue is never cleared if the form unmounts. The flag goes into `history.state` at the push and comes back set. `Loaded.test.ts` has this as a `[SURPRISE]` test with a boolean. I removed the field and read `h.patched.user`. That is honest about the data and wrong about ownership: it says "someone's save of this user is unconfirmed", not "my save is running". It also only exists for mutations that declare `optimistic`.
2. **A failed save after leaving reports nowhere.** `SaveFailed` restores the draft and shows the reason, for a form that is still mounted. If the user has left, the patch comes off and the name silently reverts. I did not test this path; it follows from the code.
3. **What `h.previous` returns.** An `Option` of the value, so the view merges it with `h.loaded` by hand. See the three lines above. I considered returning a Success with `waiting: true` and decided the Option was harder to misuse.
4. **"Loading page N…".** With one field there is no `shownPage`. The page number on screen comes from the value, and "loading" is `model.page !== page`.
5. **`invalidates` when `writes` and patches already cover it**, **tag or read**, **where the Layers go**: as in the first report. Where the mutation Layer goes now matters more, because it decides how long a save lives (F-R3).

### Mistakes that compile

- An in-flight flag in the Model for a `Command.Service` mutation. It was fragile before and is now never cleared after unmount.
- Reading `h.patched` as "my save is running".
- Reading `waiting` as "a save is running". It was true in the first prototype and is false now.
- Rendering the list from `h.loaded.users` alone: correct, and it goes back to "Loading users…" on every page change. Nothing points at `h.previous`.
- Providing `RenameUser.layer` with `Component.provide(..., { local: true })` on the component that unmounts: the save is interrupted on leave, as before decision 6. Tested in `Loaded.test.ts`.
- Providing it outside `mount`: the save outlives the root.
- A `Command.Service` that adds a finalizer to its Scope and expects "runs when the save ends": the Scope is the instance's (F-R1).
- Clearing the draft at issue and not restoring it on failure. Omitting `writes` or the `patchAll`. As before.

Gone from this list: a view that reads "shown" only, promoting `shownPage` too early, and an `onInitial` arm flashing on every warm mount.

### What an AI agent would most likely get wrong

In order of likelihood: a boolean `saving` in the Model (every existing example of this pattern has one, and it passes any test that stays on the page); showing a spinner from `waiting` during a save; forgetting `h.previous` and paging with a full loading state; providing the mutation Layer next to the form; forgetting the watch handler for a field it added (now a compile error, so the cheapest of the five).

## The ticket's questions

**Is seeding the cold entry as stale needed?** Done as decision 8, and it behaves as hoped in both directions. The open point is the snapshot taken under a patch (F-R7).

**Does "keep previous page" work?** Yes, with one field and three lines in the view. The two-field recipe is deleted from the app and should not be documented.

**Is the payload size acceptable, or is "Models reference entries" needed?** 2x uncompressed on both pages now. Acceptable for a first release. Referencing entries would save 48% on the list and nothing in `history.state`.

## Findings that need a decision

Full text in `FINDINGS.md` under "Runtime after the resolution, round 2".

1. **F-R1.** A detached run still gets the instance's Scope, because `Router.Block` relies on it. Is that the rule, or does `Router.Block` change?
2. **F-R3.** A run outlives the mount when its Layer is provided outside it. Should the root be a second owner?
3. **F-R4.** There is no honest "my save is running" for a view. `h.patched` is the nearest thing and is per entry. Does the runtime expose pending runs to the view, or is the Model flag documented as unsafe?
4. **F-R7.** A snapshot taken under a patch: dropped from the restored Model (what I did), or kept on screen and only kept out of the cache?
5. **F-R6.** `h.previous` as `Option<value>`: confirm, or return an `AsyncResult`.
6. **F-R5.** Whether `update` gets `$.previousOf` and `$.patchedOf`.

## Not done

- No real browser. The BrowserHost claim rests on happy-dom and a `MutationObserver`.
- No test for: `Command.interrupt` on a run whose instance is gone, a failed save after unmount, `h.previous` over a Failure snapshot, and "an instance whose own Layer is still building still commits Initial". Stream Commands and `Command.make` ending with the instance rely on the existing Runtime tests.
- No re-key test on BrowserHost. Re-key is covered on TestHost only.
- Decisions 9 to 12 needed no runtime change. 9 and 10 are exercised by the app. 11 and 12 are covered only by the core's own tests.
- `Component.provide` for the read Layers, `refetchInterval`, `Loader.Connectivity`, `static: true` (beyond the existing SSR test), and `get`/`prefetch` from a Command were not used by the app.
- The page lives in the list's Model, not the URL.
- No type test was added for `h.previous` and `h.patched`. The app and tests use them under tsc.
- The gzip numbers use seeded, repetitive data. The `open` numbers are from a loaded machine and vary by a factor of two between runs.
