import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as PlatformError from "effect/PlatformError"
import { ProcessId } from "effect/process/ChildProcessSpawner"
import * as NodeChildProcess from "node:child_process"
import * as Crypto from "node:crypto"
import { EventEmitter } from "node:events"
import * as Fs from "node:fs"
import * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"
import type { SpawnedProcess, SpawnProcess } from "./nodeChildProcessSpawner.ts"
import { source } from "./proxyProcessSource.ts"
import { headerLength, tokenLength } from "./proxyProcessWorker.ts"
import { handleErrnoException } from "./utils.ts"

// macOS limits Unix socket paths to 104 bytes including the terminator, Linux to 108
const maxSocketPathLength = 103

type Message =
  | { readonly _tag: "Ready" }
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
  /** The request has been sent to the proxy process, which may have started the command. */
  dispatched = false
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  readonly stdio: Array<Net.Socket | null>
  private spawned = false
  private done = false
  private referenced = true
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
    if (this.spawned || this.pid === undefined) return
    if (this.pipes.some((pipe, fd) => pipe && this.stdio[fd] === null)) return
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

/** @internal */
export interface Options {
  readonly executable?: string | undefined
  readonly args?: ReadonlyArray<string> | undefined
  readonly env?: Record<string, string | undefined> | undefined
  readonly responseTimeoutMillis: number
}

class Proxy implements ProxiedProcessOwner {
  readonly commands = new Map<number, ProxiedProcess>()
  readonly credentials = credentials()
  pid: number | undefined = undefined
  ready = false
  exited = false
  retired = false
  private failure: Error | undefined = undefined
  private readonly options: Options
  private readonly token = Crypto.randomBytes(tokenLength)
  private nextId = 0
  // Starting holds a reference, so the application waits for the proxy process to be ready
  private refs = 1
  private directory: string | undefined
  private server: Net.Server | undefined
  private child: NodeChildProcess.ChildProcess | undefined
  // Bounds the wait for `Ready`, and for the reply to each sent request
  private readonly timers = new Map<number | "ready", ReturnType<typeof setTimeout>>()
  private readonly readyCallbacks = new Set<(error: Error | undefined) => void>()

  constructor(options: Options) {
    this.options = options
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
      const env = options.env ?? { ...globalThis.process.env }
      if (options.env === undefined) {
        // Commands receive their environment with each request, and the proxy
        // process must not load the application's preloads or inspector
        delete env.NODE_OPTIONS
      }
      this.child = NodeChildProcess.spawn(
        options.executable ?? globalThis.process.execPath,
        options.args ?? ["--input-type=module", "-e", source],
        { env, stdio: ["inherit", "inherit", "inherit", "ipc"], windowsHide: true }
      )
      this.pid = this.child.pid
      this.child.on("message", (message: Message) => this.receive(message))
      this.child.on("error", (error) => this.end(error))
      this.child.on(
        "exit",
        (code, signal) =>
          this.end(new Error(`The proxy process exited with ${signal === null ? `code ${code}` : `signal ${signal}`}`))
      )
      this.startTimer("ready")
      // The socket path and token are kept out of the arguments, which other
      // users can read
      this.send({ _tag: "Init", socketPath, token: this.token.toString("hex") })
      this.updateRef()
    } catch (error) {
      globalThis.process.nextTick(() => this.end(error as Error))
    }
  }

  /**
   * Sends a spawn request at once. Requests are never queued, so a spawn that
   * is interrupted while it waits for a proxy process to be ready has nothing
   * to withdraw. A proxy process that is no longer ready to take spawns, or
   * whose credentials are out of date, fails the spawn without sending it.
   */
  spawn(command: string, args: ReadonlyArray<string>, options: NodeChildProcess.SpawnOptions): ProxiedProcess {
    const id = this.nextId
    this.nextId = (this.nextId + 1) % 0x1_0000_0000
    const stdio = (options.stdio as ReadonlyArray<NodeChildProcess.IOType | undefined>).map((mode) =>
      mode === undefined || mode === "overlapped" ? "pipe" : mode
    )
    const child = new ProxiedProcess(this, id, stdio.map((mode) => mode === "pipe"))
    this.commands.set(id, child)
    if (!this.ready || this.exited || this.retired || this.credentials !== credentials()) {
      const error = new Error("The proxy process stopped taking spawns before the command was sent to it")
      globalThis.process.nextTick(() => child.onError(error))
      return child
    }
    child.dispatched = true
    this.startTimer(id)
    this.send({
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
    })
    return child
  }

  /**
   * Calls back once the proxy process is ready, or with the error that stopped
   * it. Returns a function that removes the callback.
   */
  whenReady(callback: (error: Error | undefined) => void): () => void {
    if (this.ready || this.exited) {
      callback(this.ready ? undefined : this.failure)
      return () => {}
    }
    this.readyCallbacks.add(callback)
    return () => this.readyCallbacks.delete(callback)
  }

  ref(): void {
    this.refs++
    this.updateRef()
  }

  release(id: number): void {
    this.commands.delete(id)
    if (this.retired && this.commands.size === 0) this.disconnect()
  }

  /**
   * Stops taking spawns, and disconnects once the running commands have
   * exited. A proxy process that is not ready yet has no commands and is
   * stopped.
   */
  retire(): void {
    this.retired = true
    if (!this.ready) return this.stop(new Error("The proxy process was retired before it was ready"))
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
    if (!this.ready) {
      this.stop(new Error("The proxy process was stopped before it was ready"))
      return resume(Effect.void)
    }
    // Each referenced command holds one reference
    const wait = this.refs === this.commands.size
    if (wait) {
      child.ref()
      child.once("exit", () => resume(Effect.void))
    }
    this.disconnect()
    if (!wait) resume(Effect.void)
  })

  /** Stops a proxy process that has not been sent any command, or has stopped answering. */
  private stop(cause: Error): void {
    // Its exit has not been seen, so its ID has not been reused
    this.child?.kill("SIGKILL")
    this.end(cause)
  }

  private send(message: unknown): void {
    if (this.child?.connected !== true) return
    this.child.send(message as NodeChildProcess.Serializable, (error: Error | null) => {
      if (error) this.end(error)
    })
  }

  private startTimer(key: number | "ready"): void {
    const millis = this.options.responseTimeoutMillis
    const timer = setTimeout(() => {
      this.stop(
        Object.assign(new Error(`The proxy process did not respond within ${millis} ms`), { code: "ETIMEDOUT" })
      )
    }, millis)
    // Whatever waits for the reply keeps the application running
    timer.unref()
    this.timers.set(key, timer)
  }

  private stopTimer(key: number | "ready"): void {
    clearTimeout(this.timers.get(key))
    this.timers.delete(key)
  }

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
    if (message._tag === "Ready") return this.onReady()
    const command = this.commands.get(message.id)
    if (command === undefined) return
    switch (message._tag) {
      case "Spawned":
        this.stopTimer(message.id)
        return command.onSpawned(message.pid)
      case "Exit":
        return command.onExit(message.code, message.signal)
      case "Error":
        this.stopTimer(message.id)
        return command.onError(deserializeError(message.error))
    }
  }

  private onReady(): void {
    if (this.ready || this.exited) return
    this.ready = true
    this.stopTimer("ready")
    this.unref()
    this.notifyReady(undefined)
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
    const { directory, server } = this
    this.directory = undefined
    this.server = undefined
    server?.close()
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
    this.failure = cause
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    if (!this.ready) this.unref()
    const notSent = new Error("The proxy process stopped before the command was sent to it, so it was not started", {
      cause
    })
    const unacknowledged = new Error(
      "The proxy process stopped after the command was sent to it but before it replied, so the command may have started",
      { cause }
    )
    const lost = new Error("The proxy process exited before the command's exit status was received", { cause })
    // Every command is marked lost before anything else can run
    const reports = Array.from(
      this.commands.values(),
      (command) => command.onLost(command.pid !== undefined ? lost : command.dispatched ? unacknowledged : notSent)
    )
    this.disconnect()
    for (const report of reports) report()
    if (!this.ready) this.notifyReady(cause)
  }

  private notifyReady(error: Error | undefined): void {
    const callbacks = [...this.readyCallbacks]
    this.readyCallbacks.clear()
    for (const callback of callbacks) callback(error)
  }
}

const toStartError = (options: Options) => (error: NodeJS.ErrnoException): PlatformError.PlatformError => {
  const executable = options.executable ?? globalThis.process.execPath
  if (error.code === "ETIMEDOUT") {
    return PlatformError.systemError({
      _tag: "TimedOut",
      module: "ChildProcess",
      method: "layerProxyProcess",
      description: error.message,
      pathOrDescriptor: executable,
      cause: error
    })
  }
  if (error.syscall !== undefined) {
    return handleErrnoException("ChildProcess", "layerProxyProcess")(error, [executable])
  }
  return PlatformError.systemError({
    _tag: "Unknown",
    module: "ChildProcess",
    method: "layerProxyProcess",
    description: error.message,
    pathOrDescriptor: executable,
    cause: error
  })
}

/**
 * Starts a proxy process. Another one is started on demand after it exits, or
 * after the application changes its credentials.
 *
 * @internal
 */
export const make = (options: Options) => {
  let closed = false
  let current = new Proxy(options)
  // Retired proxy processes still running commands
  const retired = new Set<Proxy>()
  const get = () => {
    if (current.exited) {
      current = new Proxy(options)
    } else if (current.credentials !== credentials()) {
      // The application changed its credentials, so its commands must not
      // run with the old ones
      const previous = current
      current = new Proxy(options)
      retired.add(previous)
      previous.retire()
    }
    for (const proxy of retired) {
      if (proxy.exited) retired.delete(proxy)
    }
    return current
  }
  const toError = toStartError(options)
  // Waits, interruptibly, for a proxy process that is ready to take spawns.
  // Nothing has been sent while waiting, so interruption has nothing to undo.
  const ready: Effect.Effect<Proxy, PlatformError.PlatformError> = Effect.suspend(() => {
    if (closed) {
      return Effect.fail(PlatformError.systemError({
        _tag: "BadResource",
        module: "ChildProcess",
        method: "spawn",
        description: "The layerProxyProcess layer has been released"
      }))
    }
    const proxy = get()
    if (proxy.ready) return Effect.succeed(proxy)
    return Effect.callback<Proxy, PlatformError.PlatformError>((resume) => {
      const remove = proxy.whenReady((error) => {
        if (error === undefined) return resume(Effect.succeed(proxy))
        // Retired by a credential change while starting, so wait for its replacement
        resume(proxy.retired ? ready : Effect.fail(toError(error)))
      })
      return Effect.sync(remove)
    })
  })
  return {
    prepareSpawn: Effect.map(
      ready,
      (proxy): SpawnProcess => (command, args, options) => proxy.spawn(command, args, options)
    ),
    /** Waits for the first proxy process to be ready. */
    ready: Effect.callback<void, PlatformError.PlatformError>((resume) => {
      current.whenReady((error) => resume(error === undefined ? Effect.void : Effect.fail(toError(error))))
    }),
    currentPid: Effect.sync(() =>
      !closed && current.ready && !current.exited && current.pid !== undefined
        ? Option.some(ProcessId(current.pid))
        : Option.none()
    ),
    close: Effect.suspend(() => {
      closed = true
      return Effect.forEach([current, ...retired], (proxy) => proxy.close, { concurrency: "unbounded", discard: true })
    })
  }
}
