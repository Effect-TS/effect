import * as Effect from "effect/Effect"
import * as NodeChildProcess from "node:child_process"
import * as Crypto from "node:crypto"
import { EventEmitter } from "node:events"
import * as Fs from "node:fs"
import * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"
import type { SpawnedProcess } from "./nodeChildProcessSpawner.ts"

const tokenLength = 16
const headerLength = tokenLength + 8
// macOS limits Unix socket paths to 104 bytes including the terminator, Linux to 108
const maxSocketPathLength = 103

// The proxy process runs this with `node -e`, so it must not import anything
// but Node.js builtins. For each piped fd it connects to the application's
// socket, identifies the socket with a header, and hands it to the command as
// that fd, so no output passes through the proxy process.
const source = `"use strict"
const ChildProcess = require("node:child_process")
const Net = require("node:net")
const [socketPath, token] = process.argv.slice(1)
const send = (message) => {
  if (process.connected) process.send(message)
}
const serializeError = (error) => ({
  message: error.message,
  code: error.code,
  errno: error.errno,
  syscall: error.syscall,
  path: error.path
})
const connect = (id, fd) => new Promise((resolve, reject) => {
  const socket = Net.connect(socketPath)
  socket.pause()
  socket.once("error", reject)
  socket.once("connect", () => {
    const header = Buffer.alloc(${headerLength})
    header.write(token, "hex")
    header.writeUInt32BE(id, ${tokenLength})
    header.writeUInt32BE(fd, ${tokenLength + 4})
    socket.write(header, (error) => error ? reject(error) : resolve(socket))
  })
})
const spawn = async ({ id, command, args, options }) => {
  const stdio = await Promise.allSettled(options.stdio.map((mode, fd) => mode === "pipe" ? connect(id, fd) : mode))
  const sockets = stdio.flatMap((result) => result.value instanceof Net.Socket ? [result.value] : [])
  try {
    const failure = stdio.find((result) => result.status === "rejected")
    if (failure) throw failure.reason
    const child = ChildProcess.spawn(command, args, { ...options, stdio: stdio.map((result) => result.value) })
    child.on("error", (error) => send({ _tag: "Error", id, error: serializeError(error) }))
    child.on("spawn", () => send({ _tag: "Spawned", id, pid: child.pid }))
    child.on("exit", (code, signal) => send({ _tag: "Exit", id, code, signal }))
  } catch (error) {
    send({ _tag: "Error", id, error: serializeError(error) })
  } finally {
    // The command holds its own copies of the sockets
    for (const socket of sockets) socket.destroy()
  }
}
// The application decides how to handle these. Once it has disconnected,
// the proxy process exits when its commands have exited.
process.on("SIGINT", () => {})
process.on("SIGTERM", () => {})
process.on("message", spawn)
`

type Message =
  | { readonly _tag: "Spawned"; readonly id: number; readonly pid: number }
  | { readonly _tag: "Exit"; readonly id: number; readonly code: number | null; readonly signal: NodeJS.Signals | null }
  | {
    readonly _tag: "Error"
    readonly id: number
    readonly error: { readonly message: string } & Partial<NodeJS.ErrnoException>
  }

const deserializeError = ({ message, ...props }: { readonly message: string }): Error =>
  Object.assign(new Error(message), props)

/** @internal */
export interface ProxiedProcessOwner {
  ref(): void
  unref(): void
  release(id: number): void
}

/** @internal */
export class ProxiedProcess extends EventEmitter implements SpawnedProcess {
  pid: number | undefined = undefined
  lost = false
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  readonly stdio: Array<Net.Socket | null>
  private pendingSockets: number
  private spawned = false
  private done = false
  referenced = true
  private pendingExit: readonly [number | null, NodeJS.Signals | null] | undefined = undefined
  private pendingKill: NodeJS.Signals | number | undefined = undefined

  private readonly proxy: ProxiedProcessOwner
  readonly id: number
  private readonly pipes: ReadonlyArray<boolean>

  constructor(proxy: ProxiedProcessOwner, id: number, pipes: ReadonlyArray<boolean>) {
    super()
    this.proxy = proxy
    this.id = id
    this.pipes = pipes
    this.stdio = pipes.map(() => null)
    this.pendingSockets = pipes.filter(Boolean).length
    proxy.ref()
  }

  get stdin() {
    return this.stdio[0] ?? null
  }
  get stdout() {
    return this.stdio[1] ?? null
  }
  get stderr() {
    return this.stdio[2] ?? null
  }

  kill(signal: NodeJS.Signals | number = "SIGTERM"): boolean {
    if (this.exitCode !== null || this.signalCode !== null) return false
    if (this.pid === undefined) {
      if (this.done) return false
      this.pendingKill = signal
      return true
    }
    try {
      globalThis.process.kill(this.pid, signal)
      return true
    } catch {
      return false
    }
  }

  ref(): void {
    if (!this.referenced && !this.done) {
      this.referenced = true
      this.proxy.ref()
    }
  }

  unref(): void {
    if (this.referenced) {
      this.referenced = false
      this.proxy.unref()
    }
  }

  attach(fd: number, socket: Net.Socket): boolean {
    if (this.done || this.pipes[fd] !== true || this.stdio[fd] !== null) return false
    this.stdio[fd] = socket
    this.pendingSockets--
    this.emitSpawn()
    return true
  }

  onSpawned(pid: number): void {
    this.pid = pid
    if (this.pendingKill !== undefined) this.kill(this.pendingKill)
    this.emitSpawn()
  }

  onExit(code: number | null, signal: NodeJS.Signals | null): void {
    if (!this.spawned) {
      // The exit can overtake the stdio sockets
      this.pendingExit = [code, signal]
      return
    }
    this.exitCode = code
    this.signalCode = signal
    this.finish()
    this.emit("exit", code, signal)
  }

  /** Fails the spawn, unless the handle has already been published. */
  onError(error: Error): void {
    if (this.spawned || this.done) return
    this.finish()
    for (const socket of this.stdio) socket?.destroy()
    this.emit("error", error)
  }

  /**
   * The exit status can no longer be observed. Marks the process, and returns
   * a function that reports it, so that every process of a proxy process is
   * marked before listeners can observe any of them.
   */
  onLost(error: Error): () => void {
    if (this.done) return () => {}
    // A spawn still waiting for its stdio sockets fails, and late sockets are rejected
    if (!this.spawned) return () => this.onError(error)
    this.lost = true
    this.finish()
    return () => this.emit("lost", error)
  }

  private emitSpawn(): void {
    if (this.spawned || this.pid === undefined || this.pendingSockets > 0) return
    this.spawned = true
    this.emit("spawn")
    if (this.pendingExit !== undefined) this.onExit(...this.pendingExit)
  }

  private finish(): void {
    this.unref()
    this.done = true
    this.proxy.release(this.id)
  }
}

// Commands run with the credentials of the proxy process, which are fixed when
// it starts
const credentials = (): string => {
  const process = globalThis.process
  return [
    process.getuid?.(),
    process.geteuid?.(),
    process.getgid?.(),
    process.getegid?.(),
    process.getgroups?.().join(",")
  ].join(":")
}

class Proxy implements ProxiedProcessOwner {
  readonly commands = new Map<number, ProxiedProcess>()
  readonly credentials = credentials()
  exited = false
  private retired = false
  private readonly token = Crypto.randomBytes(tokenLength)
  private nextId = 0
  private refs = 0
  private directory: string | undefined
  private server: Net.Server | undefined
  private child: NodeChildProcess.ChildProcess | undefined

  constructor() {
    try {
      this.directory = Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-proxy-"))
      const socketPath = Path.join(this.directory, "socket")
      if (Buffer.byteLength(socketPath) > maxSocketPathLength) {
        throw new Error(
          `The proxy process socket path ${socketPath} exceeds ${maxSocketPathLength} bytes; set TMPDIR to a shorter directory`
        )
      }
      this.server = Net.createServer((socket) => this.accept(socket))
      this.server.on("error", (error) => this.end(error))
      this.server.listen(socketPath)
      this.server.unref()
      const env = { ...globalThis.process.env }
      // Commands receive their environment with each request, and the proxy
      // process must not load the application's preloads or inspector
      delete env.NODE_OPTIONS
      this.child = NodeChildProcess.spawn(
        globalThis.process.execPath,
        ["-e", source, socketPath, this.token.toString("hex")],
        { env, stdio: ["inherit", "inherit", "inherit", "ipc"], windowsHide: true }
      )
      this.child.on("message", (message: Message) => this.receive(message))
      this.child.on("error", (error) => this.end(error))
      this.child.on(
        "exit",
        (code, signal) =>
          this.end(new Error(`The proxy process exited with ${signal === null ? `code ${code}` : `signal ${signal}`}`))
      )
      this.updateRef()
    } catch (error) {
      globalThis.process.nextTick(() => this.end(error as Error))
    }
  }

  spawn(command: string, args: ReadonlyArray<string>, options: NodeChildProcess.SpawnOptions): ProxiedProcess {
    const id = this.nextId
    this.nextId = (this.nextId + 1) % 0x1_0000_0000
    const stdio = (options.stdio as ReadonlyArray<NodeChildProcess.IOType | undefined>).map((mode) =>
      mode === undefined || mode === "overlapped" ? "pipe" : mode
    )
    const child = new ProxiedProcess(this, id, stdio.map((mode) => mode === "pipe"))
    this.commands.set(id, child)
    const request = {
      id,
      command,
      args,
      options: {
        cwd: options.cwd ?? globalThis.process.cwd(),
        env: options.env ?? globalThis.process.env,
        detached: options.detached,
        shell: options.shell,
        windowsHide: options.windowsHide,
        stdio
      }
    }
    if (this.child?.connected === true) {
      this.child.send(request, (error: Error | null) => {
        if (error) this.end(error)
      })
    }
    return child
  }

  ref(): void {
    this.refs++
    this.updateRef()
  }

  release(id: number): void {
    this.commands.delete(id)
    if (this.retired && this.commands.size === 0) this.disconnect()
  }

  /** Stops taking spawns, and disconnects once the running commands have exited. */
  retire(): void {
    this.retired = true
    if (this.commands.size === 0) this.disconnect()
  }

  unref(): void {
    this.refs--
    this.updateRef()
  }

  /**
   * Disconnects from the proxy process, which exits once its commands have
   * exited. Waits for that unless an unreferenced command may outlive it.
   */
  readonly close: Effect.Effect<void> = Effect.callback((resume) => {
    const child = this.child
    if (this.exited || child === undefined) return resume(Effect.void)
    const wait = [...this.commands.values()].every((command) => command.referenced)
    if (wait) {
      child.ref()
      child.once("exit", () => resume(Effect.void))
    }
    this.disconnect()
    if (!wait) resume(Effect.void)
  })

  private disconnect(): void {
    if (this.child?.connected === true) this.child.disconnect()
    this.closeServer()
  }

  private updateRef(): void {
    if (this.refs > 0) {
      this.child?.ref()
      this.child?.channel?.ref()
    } else {
      this.child?.unref()
      this.child?.channel?.unref()
    }
  }

  private receive(message: Message): void {
    const command = this.commands.get(message.id)
    if (command === undefined) return
    switch (message._tag) {
      case "Spawned":
        return command.onSpawned(message.pid)
      case "Exit":
        return command.onExit(message.code, message.signal)
      case "Error":
        return command.onError(deserializeError(message.error))
    }
  }

  private accept(socket: Net.Socket): void {
    // Errors are reported to the readers and writers of the stdio streams
    socket.on("error", () => {})
    const onReadable = () => {
      const header: Buffer | null = socket.read(headerLength)
      if (header === null) return
      socket.off("readable", onReadable)
      const command =
        header.length === headerLength && Crypto.timingSafeEqual(header.subarray(0, tokenLength), this.token)
          ? this.commands.get(header.readUInt32BE(tokenLength))
          : undefined
      if (command === undefined || !command.attach(header.readUInt32BE(tokenLength + 4), socket)) {
        socket.destroy()
      }
    }
    socket.on("readable", onReadable)
  }

  /**
   * Best effort, and never throws, since it runs while exits and losses are
   * being reported. Removal fails if the application has since changed its
   * credentials, in which case the directory is left behind.
   */
  private closeServer(): void {
    this.server?.close(() => {})
    const directory = this.directory
    this.directory = undefined
    if (directory !== undefined) {
      try {
        Fs.rmSync(directory, { recursive: true, force: true })
      } catch {
        // ignored
      }
    }
  }

  private end(cause: Error): void {
    if (this.exited) return
    this.exited = true
    const error = new Error("The proxy process exited before the command's exit status was received", { cause })
    // Every command is marked lost before anything else can run
    const reports = Array.from(this.commands.values(), (command) => command.onLost(error))
    this.disconnect()
    for (const report of reports) report()
  }
}

/** @internal */
export const make = () => {
  let current = new Proxy()
  // Retired proxy processes still running commands
  const retired = new Set<Proxy>()
  const get = () => {
    if (current.exited) {
      current = new Proxy()
    } else if (current.credentials !== credentials()) {
      // The application changed its credentials, so its commands must not
      // run with the old ones
      const previous = current
      current = new Proxy()
      retired.add(previous)
      previous.retire()
    }
    for (const proxy of retired) {
      if (proxy.exited) retired.delete(proxy)
    }
    return current
  }
  return {
    spawn: (command: string, args: ReadonlyArray<string>, options: NodeChildProcess.SpawnOptions): SpawnedProcess =>
      get().spawn(command, args, options),
    close: Effect.suspend(() =>
      Effect.forEach([current, ...retired], (proxy) => proxy.close, { concurrency: "unbounded", discard: true })
    )
  }
}
