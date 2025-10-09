# Debug Steps CLI

Command-line tool for stepping through Node.js scripts using the Chrome DevTools Protocol.

## Installation

```bash
npm install -g @effect-native/debug
# or use with npx (no installation required)
```

## Usage

```bash
npx @effect-native/debug steps [options] <file>
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `<file>` | Path to the JavaScript or TypeScript file to debug | Yes |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-steps <n>` | Maximum number of steps to execute | `200` |
| `--port <n>` | Inspector port to use (1-65535) | Random (9300-9399) |
| `-h, --help` | Show help message | - |

## Examples

### Basic Usage

Step through a JavaScript file:

```bash
npx @effect-native/debug steps ./my-script.js
```

Step through a TypeScript file:

```bash
npx @effect-native/debug steps ./my-script.ts
```

### Custom Step Limit

Increase the maximum number of steps for long-running scripts:

```bash
npx @effect-native/debug steps --max-steps 1000 ./app.js
```

### Custom Port

Use a specific inspector port:

```bash
npx @effect-native/debug steps --port 9229 ./index.js
```

### Combined Options

```bash
npx @effect-native/debug steps --max-steps 500 --port 9229 ./server.js
```

## Output Format

The CLI displays each step in the following format:

```
[<step>] <file>:<line>:<column> <function>
      > <source code>
```

### Example Output

```
🔍 Debug Step-Through
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Launching: node --inspect-brk=9341 /path/to/my-script.js
[target] Debugger listening on ws://127.0.0.1:9341/...
🔌 Connected to ws://127.0.0.1:9341/...
[target] Debugger attached.
✅ Debugger enabled
▶️  Runtime.runIfWaitingForDebugger invoked
⏸️  Initial pause requested
🔁 Stepping through code (Ctrl+C to stop)...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[   1] my-script.js:1:0 (anonymous)
      > const greeting = "Hello"
[   2] my-script.js:2:0 (anonymous)
      > const name = "World"
[   3] my-script.js:3:0 (anonymous)
      > console.log(greeting + " " + name)
[target] Hello World
[   4] my-script.js:5:0 (anonymous)
      > function add(a, b) {
[   5] my-script.js:10:0 (anonymous)
      > const result = add(5, 3)
[   6] my-script.js:6:2 add
      > return a + b
[   7] my-script.js:11:0 (anonymous)
      > console.log("Result:", result)
[target] Result: 8

🏁 Reached maximum step count (200). Exiting debugger session.
✅ Finished stepping session
```

## How It Works

1. **Launches Target**: Starts your script with `node --inspect-brk=<port>`
2. **Connects**: Automatically discovers and connects to the WebSocket debugger endpoint
3. **Enables Debugger**: Sends `Debugger.enable` command via Chrome DevTools Protocol
4. **Steps Through**: Uses `Debugger.stepOver` to execute code line-by-line
5. **Displays Output**: Shows each step with file location, function name, and source code
6. **Exits Gracefully**: Stops after reaching max steps or on Ctrl+C

## Use Cases

### 🐛 Debugging Production Issues

Step through problematic code without modifying it:

```bash
npx @effect-native/debug steps --max-steps 1000 ./problematic-function.js
```

### 📚 Learning New Codebases

Understand execution flow of unfamiliar code:

```bash
npx @effect-native/debug steps ./complex-algorithm.js
```

### 🔍 Tracing Bugs

Follow the exact execution path to find issues:

```bash
npx @effect-native/debug steps --max-steps 500 ./buggy-script.js
```

### 📊 Performance Analysis

See which functions are called and in what order:

```bash
npx @effect-native/debug steps ./performance-test.js
```

### 🎓 Teaching

Demonstrate code execution to students:

```bash
npx @effect-native/debug steps --max-steps 50 ./lesson-example.js
```

## Troubleshooting

### Port Already in Use

If you get an error about the port being in use, specify a different port:

```bash
npx @effect-native/debug steps --port 9230 ./my-script.js
```

### Script Runs Too Long

If your script has many steps, increase the max-steps limit:

```bash
npx @effect-native/debug steps --max-steps 5000 ./long-script.js
```

### TypeScript Not Working

Make sure you have `tsx` installed in your project or globally:

```bash
npm install -g tsx
```

The CLI uses `tsx` to handle TypeScript files automatically.

### Connection Timeout

If the debugger fails to connect:
- Check that no other debugger is attached to the same port
- Try a different port with `--port`
- Ensure your script doesn't immediately exit

### Stopping Execution

Press `Ctrl+C` to stop the debugger at any time.

## Advanced

### Programmatic Usage

You can also use the CLI module programmatically:

```typescript
import { main } from "@effect-native/debug/cli/steps"

// The CLI is built on @effect-native/debug
// See the main README for building custom debugging tools
```

### Building Custom Tools

For more control, use the `@effect-native/debug` library directly:

```typescript
import * as Debug from "@effect-native/debug"
import * as Effect from "effect/Effect"

// Build custom debugging workflows
// See README.md for examples
```

## Related

- [Main Documentation](./README.md) - Full API documentation
- [Debug Service](./src/Debug.ts) - Core debugging service
- [Examples](./examples/) - More usage examples

## License

MIT