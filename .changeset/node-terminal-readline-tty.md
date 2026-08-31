---
"@effect/platform-node-shared": patch
---

NodeTerminal: keep stdin in cooked mode for `readLine` on a TTY so typed input is echoed and Ctrl+C interrupts as expected. Raw mode is now enabled only while reading key input.
