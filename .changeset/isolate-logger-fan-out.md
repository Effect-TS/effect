---
"effect": patch
---

Keep a failing logger or error reporter from affecting the program or the other sinks. A logger that throws no longer skips the other loggers or fails the logging fiber, an `ErrorReporter` that throws no longer skips the other reporters or reasons, and `Logger.batched` keeps flushing after a flush dies. A logger's error is logged at `References.UnhandledLogLevel`, and a reporter's error is reported to the reporters. `Formatter.formatJson` and `Cause.pretty` no longer throw on values with throwing getters, hostile Proxies or cyclic `toJSON`/`cause` chains, so `Logger.consoleJson` and the other built-in loggers can log them, and `Formatter.format` clamps its `space` option the way `JSON.stringify` does instead of throwing on a negative or oversized one. The logfmt, simple, structured, pretty and tracer loggers allocate less per log call.
