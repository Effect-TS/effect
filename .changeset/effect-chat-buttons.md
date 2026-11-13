---
"effect": patch
---

Add buttons, selects and modals to `effect/chat`. The new `ChatUi` module has the elements, and the new `ChatInteraction` module has typed definitions, groups, `handle` with its deadline, and `layer`. `post` and `edit` take `actions`, `ChatMarkdown.post` sends them with the last part, and `Descriptor.measure` measures them. `ChatTest` gains `click`, `submit`, `interact`, `checkInteraction`, the `interactions` conformance hook and the buttons and modals rules.

The conformance rules `unsupported/buttons` and `unsupported/selects` run against every adapter, without a new capability. A third-party adapter that ignores `actions` and posts anyway will start failing them. It should fail `Unsupported` naming `buttons` or `selects` until it supports them.
