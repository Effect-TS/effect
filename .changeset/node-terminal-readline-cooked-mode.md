---
"@effect/platform-node-shared": patch
---

Keep the TTY in cooked mode while the Node, Bun and Deno terminals read a line, so `readLine` echoes typed input and Ctrl+C sends SIGINT. Raw mode is now only enabled while `readInput` reads keys, so the terminal still does not echo prompt input such as passwords.
