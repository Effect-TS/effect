#!/usr/bin/env node
// The `etest` launcher. Before loading anything heavy:
// 1. If `etest serve` is running for this directory, forward the command line to it and
//    relay its output and exit code (see Server.ts). `--no-server` skips this.
// 2. Otherwise run here: turn on Node's on-disk compile cache, so repeat runs skip compiling
//    (and type-stripping) every module again, then start the CLI. The cache roughly halves
//    startup; where `enableCompileCache` doesn't exist (Bun, Deno) it is skipped.
import * as fs from "node:fs"
import * as Module from "node:module"
import * as net from "node:net"
import { type Response, socketPath } from "./socket.ts"

/** Command lines that always run here: the server itself, and what needs no test run. */
const runsHere = (argv: ReadonlyArray<string>) =>
  argv[0] === "serve" ||
  argv.some((arg) => ["--no-server", "--help", "-h", "--version", "-v", "--completions", "--wizard"].includes(arg))

/** Forwards `argv` to a running server; resolves `false` (run here) when there is none. */
const forward = (argv: ReadonlyArray<string>): Promise<boolean> =>
  new Promise((resolve) => {
    const location = socketPath(process.cwd())
    if (runsHere(argv) || (process.platform !== "win32" && !fs.existsSync(location))) return resolve(false)
    const socket = net.connect(location)
    let connected = false
    let exited = false
    let interrupted = false
    let buffered = ""
    const interrupt = () => {
      interrupted = true
      socket.destroy()
    }
    process.stdout.on("error", () => {}) // a closed stdout (e.g. `| head`) must not crash the relay
    socket.setEncoding("utf8")
    socket.on("connect", () => {
      connected = true
      process.once("SIGINT", interrupt)
      socket.write(JSON.stringify({ argv, cwd: process.cwd() }) + "\n")
    })
    socket.on("data", (chunk: string) => {
      buffered += chunk
      for (let newline = buffered.indexOf("\n"); newline !== -1; newline = buffered.indexOf("\n")) {
        const response = JSON.parse(buffered.slice(0, newline)) as Response
        buffered = buffered.slice(newline + 1)
        if ("out" in response) process.stdout.write(response.out)
        else if ("err" in response) process.stderr.write(response.err)
        else {
          exited = true
          process.exitCode = response.exit
        }
      }
    })
    socket.on("error", () => {
      if (!connected) resolve(false) // no server listening: run here
    })
    socket.on("close", () => {
      if (!connected) return
      process.removeListener("SIGINT", interrupt)
      if (!exited) {
        // stopped by Ctrl-C (the server interrupts the run), or the server went away: never green
        if (!interrupted) process.stderr.write("etest: the server went away during the run\n")
        process.exitCode = interrupted ? 130 : 1
      }
      resolve(true)
    })
  })

if (!(await forward(process.argv.slice(2)))) {
  if (typeof Module.enableCompileCache === "function") Module.enableCompileCache()
  await import("./main.ts")
}
