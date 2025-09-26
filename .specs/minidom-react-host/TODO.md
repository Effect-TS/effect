# MiniDom React Host Adapter — Context & Next Steps

## Current Motivation
- The main MiniDom plan still lists the React host adapter tasks (FR1.16 / SC7.12) as unstarted; stakeholders want a focused follow-up that can ship as a separate `@effect-native/minidom-react-host` package without blocking remaining core work.
- Recent integration of `MiniDom.Events` unblocks the host adapter design by exposing capability-driven observation hooks, so it is safer to decouple the host work now.
- External consumers (internal React teams, ecosystem partners) keep requesting a canonical reconciler host that understands MiniDom capability descriptors and plays nicely with Suspense; we need a single authoritative implementation.

## Aim
- Capture all of the background knowledge, open questions, and design expectations before entering the `/new-feature` workflow for the dedicated React host package.
- Make the main MiniDom spec/plan clearly reference this spin-out so contributors know the remaining work lives here.

## Goals
- Provide a bridge between MiniDom adapters and React 19's reconciler (via `react-reconciler`) that:
  - Uses capability metadata (`Sync`, `Events`, `Transaction`, etc.) to choose sync vs. async operations.
  - Supports Suspense/transition paths for async-only adapters.
  - Stays React dependency–optional for core MiniDom consumers.
- Deliver ergonomic layer helpers (`layer`, `make`) and capability descriptors for host integrations, documented and tested.
- Supply reference tests covering sync (HappyMiniDom) and async (mock remote) adapters to satisfy SC7.12.

## Known Obstacles / Risks
- Balancing optional React peer dependency: we want the host package to depend on React/`react-reconciler` without pulling React into the core `@effect-native/minidom` bundle.
- Suspense + async adapters: need to design a deterministic bridging pattern using React transitions and MiniDom.Events streams.
- Capability negotiation: mapping MiniDom capabilities onto reconciler host methods while avoiding branching explosions.
- Type fidelity: matching React 19 element/host config typings without using unsafe type assertions (Effect project policy).
- Testing strategy: we need a harness that can run reconciler tests without a browser, likely using `react-test-renderer` or custom environment.

## Open Questions / Blockers
- What minimal React peer dependency range is acceptable (React 19+ only, or should we support 18)?
- Which async adapter will serve as the canonical test fixture (mock remote AttributeBag vs. future SQL/KV adapters)?
- Do we require partial hydration or streaming APIs up front, or can we defer to future iterations?

## Decisions To-Date
- Work will ship as a separate package (`@effect-native/minidom-react-host`) published alongside core MiniDom.
- Process must follow `/new-feature` command once instructions are ready; current branch stays focused on documentation and dependency prep.
- Additional devDependencies (`react`, `@types/react`, `react-reconciler`, `scheduler`) were added to core package temporarily to enable prototyping but will be moved into the new package during implementation.

## References & Evidence
- Plan tasks in `.specs/minidom/plan.md` (React host adapter section) now point to this TODO.
- Requirements references: `.specs/minidom/requirements.md` FR1.16 / SC7.12; design notes in `.specs/minidom/design.md` (React host section).
- Observation groundwork completed via `packages-native/minidom/src/events/index.ts` and `events.test.ts`.

## Immediate Next Steps
1. Draft `/new-feature` Phase 1 instructions for the React host package referencing this document.
2. Revisit dependency strategy (move React-specific peers to the new package when scaffolded).
3. Outline experiments (e.g., `experiments/minidom/react-host-concurrency.ts`) before entering implementation.
