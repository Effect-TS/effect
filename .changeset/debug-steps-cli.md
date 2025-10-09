---
"@effect-native/debug": minor
---

Add `debug-steps` CLI tool for stepping through Node.js scripts line-by-line using the debugger protocol.

Users can now run:

```bash
npx @effect-native/debug steps ./my-script.js
```

The CLI automatically:
- Launches the script with Node.js inspector enabled
- Connects to the debugger protocol
- Steps through every line of execution
- Displays function name, line number, and source code for each step
- Supports `--max-steps` and `--port` options

See `CLI.md` for full documentation.