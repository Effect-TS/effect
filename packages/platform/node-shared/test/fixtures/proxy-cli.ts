// The entry point of a packaged application, which dispatches its private
// subcommand before it loads the application
if (process.argv[2] === "__proxy-process") {
  const { run } = await import("@effect/platform-node-shared/NodeChildProcessProxy")
  run()
} else {
  throw new Error("The proxy process must not load the application")
}
