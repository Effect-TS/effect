# Ladybird DevTools Research

## Summary
- Ladybird ships a built-in DevTools server that speaks Mozilla’s Remote Debugging Protocol so Firefox DevTools can inspect Ladybird tabs out of the box.
- Developers enable the server from the UI or `--devtools[=port]`, then connect from Firefox’s `about:debugging` page to list and inspect Ladybird tabs over the network (`Documentation/DevTools.md:1-20`, `Documentation/DevTools.md:41-109`).
- The project documents the exact RDP handshake (root/device/preference actors, watcher setup, tab descriptors) and highlights divergences from Firefox to guide contributors (`Documentation/DevTools.md:21-180`).

## Architecture
- Session initialisation mirrors Gecko: the root actor advertises itself, hands out device and preference actors, and surfaces a stubbed process descriptor before responding to `listTabs` (`Documentation/DevTools.md:41-109`).
- Watcher creation and frame inspection follow the same pattern as Firefox; Ladybird currently exposes frame watchers and TODOs note missing resource surfaces (`Documentation/DevTools.md:110-220`).
- Ladybird reuses Firefox’s system.js schema when replying to `getDescription`, but fills values with Ladybird-specific metadata (brand, UA, architecture), demonstrating protocol compatibility without custom clients (`Documentation/DevTools.md:57-74`).

## Protocol Notes
- The documentation emphasises that actors must reply in-order even when operations require async work, matching Firefox’s expectation that clients can issue concurrent requests (`Documentation/DevTools.md:26-33`).
- Logging can be enabled via `DEVTOOLS_DEBUG` to capture `>>`/`<<` JSON exchanges, aiding reverse-engineering and regression analysis (`Documentation/DevTools.md:34-39`).
- Known issues list intermittent session drops with full packet transcripts, inviting contributors to compare behaviour against Firefox’s devtools server (`Documentation/DevTools.md:221-308`).

## Development Workflow
- The doc walks through capturing RDP traffic using Servo’s `devtools_parser.py`, encouraging contributors to diff Ladybird’s responses against Firefox’s canonical behaviour when implementing new actors or resources (`Documentation/DevTools.md:309-360`).
- It also details how to spin up a reference Firefox DevTools server (`--start-debugger-server`) for side-by-side comparison, reinforcing that Ladybird aims for protocol-level parity (`Documentation/DevTools.md:264-308`).

## Implications
- Maintaining compatibility hinges on tracking Firefox DevTools changes (e.g., new watcher traits or resource types) and updating Ladybird’s actors accordingly.
- The documented workflow (enable logging, capture traffic, compare with Firefox) provides a repeatable method to validate protocol changes before shipping.

## References
- `Documentation/DevTools.md:1-360`
