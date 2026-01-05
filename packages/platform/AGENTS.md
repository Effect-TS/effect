# EFFECT PLATFORM

## OVERVIEW

Runtime-agnostic abstractions for IO: filesystem, HTTP, workers, processes.

## STRUCTURE

```
platform/
├── src/
│   ├── *.ts           # Public interfaces (Context.Tags)
│   └── internal/      # Default implementations
├── platform-node/     # Node.js runtime
├── platform-bun/      # Bun runtime
├── platform-browser/  # Browser runtime
└── platform-node-shared/ # Shared Node/Bun code
```

## WHERE TO LOOK

| Task            | Location                         | Notes                      |
| --------------- | -------------------------------- | -------------------------- |
| File operations | `FileSystem.ts`                  | read, write, stream, watch |
| HTTP client     | `HttpClient.ts`                  | fetch-like API             |
| HTTP server     | `HttpServer.ts`, `HttpRouter.ts` | Server abstractions        |
| Process spawn   | `CommandExecutor.ts`             | Run external commands      |
| Workers         | `Worker.ts`, `WorkerRunner.ts`   | Thread abstraction         |
| Sockets         | `Socket.ts`                      | TCP/WebSocket              |

## RUNTIME IMPLEMENTATIONS

| Abstraction   | Node.js                | Bun                      |
| ------------- | ---------------------- | ------------------------ |
| HTTP Server   | `node:http` + adapters | `Bun.serve()` native     |
| HTTP Client   | `http.request`/undici  | fetch API                |
| File Response | `fs.createReadStream`  | `Bun.file()` (zero-copy) |
| Workers       | `worker_threads`       | Web Workers              |
| WebSockets    | `ws` package           | Built-in                 |

## CONVENTIONS

### Service Pattern

```typescript
// Interface via Context.Tag
class FileSystem extends Context.Tag("@effect/platform/FileSystem")<
  FileSystem,
  FileSystem.FileSystem
>() {}

// Runtime-specific Layer
const NodeFileSystem = Layer.succeed(FileSystem, nodeImpl)
```

### Error Types

```typescript
class SystemError extends Schema.TaggedError<SystemError>()(
  "SystemError",
  { reason: Schema.String, ... }
) {}
```

### FiberRef Config

```typescript
// Request-scoped configuration
const currentTracerConfig = FiberRef.unsafeMake<TracerConfig>(default)
```

## ANTI-PATTERNS

- **Never hardcode runtime** - Use platform abstractions
- **Never import platform-node in shared code** - Check Context.Tag
- **No raw fetch/fs** - Use HttpClient/FileSystem services

## NOTES

- `platform-node-shared` reused by both Node and Bun
- Bun uses Node compat for FileSystem, native for HTTP
- All platform types are Effect-native (return Effect)
- Use `Layer.provide` to inject runtime at app boundary
