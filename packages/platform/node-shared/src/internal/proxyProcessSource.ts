/** @internal */
export const tokenLength = 16
/** @internal */
export const headerLength = tokenLength + 8

/**
 * The program of the proxy process. It is run with `node -e` or by
 * `NodeChildProcessProxy.run`, so it must not import anything but Node.js
 * builtins, and loads them with `process.getBuiltinModule` so that it runs as
 * either CommonJS or an ES module.
 *
 * The application sends the socket path and token in its first message, and
 * the proxy process answers `Ready`. For each piped fd of a command it
 * connects to the application's socket, identifies the socket with a header,
 * and hands it to the command as that fd, so no output passes through the
 * proxy process.
 *
 * @internal
 */
export const source = `"use strict"
if (typeof process.send !== "function") {
  process.stderr.write("The proxy process must be started by NodeChildProcessSpawner.layerProxyProcess\\n")
  process.exitCode = 1
} else {
  const ChildProcess = process.getBuiltinModule("node:child_process")
  const Net = process.getBuiltinModule("node:net")
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
  const connect = (socketPath, token, id, fd) => new Promise((resolve, reject) => {
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
  const spawn = async (socketPath, token, { id, command, args, options }) => {
    const stdio = await Promise.allSettled(
      options.stdio.map((mode, fd) => mode === "pipe" ? connect(socketPath, token, id, fd) : mode)
    )
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
  process.once("message", ({ socketPath, token }) => {
    process.on("message", (request) => spawn(socketPath, token, request))
    send({ _tag: "Ready" })
  })
}
`
