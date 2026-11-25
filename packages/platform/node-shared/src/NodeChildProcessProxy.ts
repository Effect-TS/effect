/**
 * The program of the proxy process started by
 * `NodeChildProcessSpawner.layerProxyProcess`, for applications that start it
 * themselves.
 *
 * By default the proxy process runs `process.execPath -e <program>`, which
 * needs `process.execPath` to be a Node.js binary. A single executable
 * application, or any other entry point that cannot run `-e`, dispatches a
 * private subcommand to {@link run} instead and passes that subcommand in the
 * layer's `args` option.
 *
 * This module imports only Node.js builtins, so the subcommand can dispatch
 * before the application is loaded.
 *
 * @stability unstable
 * @since 4.1.6
 */
import * as Vm from "node:vm"
import { source } from "./internal/proxyProcessSource.ts"

/**
 * Runs the proxy process program in the current process.
 *
 * **When to use**
 *
 * Use when a packaged or single executable application starts the proxy
 * process from its own entry point, to handle the private subcommand passed in
 * the `args` option of `NodeChildProcessSpawner.layerProxyProcess`.
 *
 * **Details**
 *
 * The program receives its socket and token over the IPC channel, answers that
 * it is ready, and then launches commands until the application disconnects.
 * It ignores `SIGINT` and `SIGTERM`, and exits once the application has
 * disconnected and its commands have exited.
 *
 * **Gotchas**
 *
 * - Run without an IPC channel, such as from a terminal, it writes one line to
 *   stderr and sets `process.exitCode` to 1.
 * - It runs under `--disallow-code-generation-from-strings`, which does not
 *   restrict the `node:vm` module it compiles the program with.
 * - The proxy process holds whatever the entry point loaded before calling
 *   `run`. Dispatch the subcommand before importing the application, so the
 *   proxy process stays small.
 *
 * **Example** (Dispatching a private subcommand)
 *
 * ```ts
 * // bin.ts, the entry point of the packaged application
 * if (process.argv[2] === "__proxy-process") {
 *   const { run } = await import("@effect/platform-node/NodeChildProcessProxy")
 *   run()
 * } else {
 *   await import("./main.ts")
 * }
 * ```
 *
 * @stability unstable
 * @category running
 * @since 4.1.6
 */
export const run = (): void => {
  // Compiled with `vm`, which `--disallow-code-generation-from-strings` does
  // not restrict, so the program has one copy for this and the `-e` default
  Vm.runInThisContext(source, { filename: "effect-proxy-process.js" })
}
