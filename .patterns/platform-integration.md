# Platform Integration Patterns - Effect Library

## 🎯 OVERVIEW
Patterns for integrating platform-specific functionality within the Effect ecosystem, including service abstractions, layer compositions, and cross-platform compatibility.

## 🏗️ SERVICE ABSTRACTION PATTERN

### Core Service Interface Definition
Define platform-agnostic interfaces in the core Effect package:

```typescript
// packages/effect/src/platform/FileSystem.ts
export interface FileSystem {
  readonly [TypeId]: TypeId
  readonly access: (path: string, options?: AccessFileOptions) => Effect.Effect<void, PlatformError>
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, PlatformError>
  readonly writeFile: (path: string, data: Uint8Array) => Effect.Effect<void, PlatformError>
  readonly stat: (path: string) => Effect.Effect<File.Info, PlatformError>
  readonly mkdir: (path: string, options?: MakeDirectoryOptions) => Effect.Effect<void, PlatformError>
  readonly readdir: (path: string) => Effect.Effect<ReadonlyArray<string>, PlatformError>
  readonly rm: (path: string, options?: RemoveOptions) => Effect.Effect<void, PlatformError>
  readonly watch: (path: string) => Stream.Stream<WatchEvent, PlatformError>
}

// Service key for dependency injection
export const FileSystem: ServiceMap.Key<FileSystem, FileSystem> = 
  ServiceMap.Key("effect/platform/FileSystem")

// Type identification
const TypeId: unique symbol = Symbol.for("effect/platform/FileSystem")
export type TypeId = typeof TypeId
```

### Tagged Service Pattern
Use service classes for type-safe dependency injection:

```typescript
// HTTP platform service
export class HttpPlatform extends ServiceMap.Key<HttpPlatform, {
  readonly fileResponse: (path: string, options?: FileResponseOptions) => Effect.Effect<Response>
  readonly fileWebResponse: (file: FileLike, options?: FileWebResponseOptions) => Effect.Effect<Response>
  readonly formData: (source: Readable) => Effect.Effect<FormData>
}>()("effect/http/HttpPlatform") {}

// Socket service
export class NetSocket extends ServiceMap.Key<NetSocket, Net.Socket>()(
  "@effect/platform-node/NodeSocket/NetSocket"
) {}
```

## 🔧 PLATFORM IMPLEMENTATION PATTERN

### Node.js Implementation Structure
```typescript
// packages/platform-node-shared/src/NodeFileSystem.ts
import { Effect, Layer } from "effect"
import * as FileSystem from "effect/platform/FileSystem"
import * as NFS from "node:fs/promises"

// Effectify Node.js callback APIs
const nodeAccess = effectify(
  NFS.access,
  handleErrnoException("FileSystem", "access")
)

const nodeReadFile = effectify(
  NFS.readFile,
  handleErrnoException("FileSystem", "readFile")
)

// Core implementation
const make = (): FileSystem.FileSystem => ({
  [FileSystem.TypeId]: FileSystem.TypeId,
  
  access: (path: string, options?: FileSystem.AccessFileOptions) => {
    let mode = NFS.constants.F_OK
    if (options?.readable) mode |= NFS.constants.R_OK
    if (options?.writable) mode |= NFS.constants.W_OK
    return nodeAccess(path, mode)
  },
  
  readFile: (path: string) =>
    nodeReadFile(path).pipe(
      Effect.map(buffer => new Uint8Array(buffer))
    ),
  
  writeFile: (path: string, data: Uint8Array) =>
    nodeWriteFile(path, data),
  
  // ... other methods
})

// Layer export
export const layer: Layer.Layer<FileSystem.FileSystem, never, never> = 
  Layer.succeed(FileSystem.FileSystem, make())
```

### Bun-Specific Optimizations
```typescript
// packages/platform-bun/src/BunFileSystem.ts
import { NodeFileSystem } from "@effect/platform-node-shared"

// Bun can use Node.js FileSystem implementation
export const layer: Layer.Layer<FileSystem.FileSystem, never, never> = 
  NodeFileSystem.layer

// Or provide Bun-specific optimizations
const bunOptimizedImplementation = (): FileSystem.FileSystem => ({
  [FileSystem.TypeId]: FileSystem.TypeId,
  
  // Use Bun's native file operations where beneficial
  readFile: (path: string) =>
    Effect.tryPromise({
      try: () => Bun.file(path).arrayBuffer().then(ab => new Uint8Array(ab)),
      catch: (error) => new PlatformError.SystemError({
        module: "FileSystem",
        method: "readFile",
        reason: "Unknown",
        pathOrDescriptor: path,
        cause: error
      })
    }),
  
  // ... other optimized methods
})
```

## 🔄 ERROR HANDLING PATTERNS

### Platform Error Transformation
Convert platform-specific errors to structured Effect errors:

```typescript
// packages/platform-node-shared/src/internal/utils.ts
export const handleErrnoException = (module: string, method: string) => 
  (err: NodeJS.ErrnoException, args: Array<any>): PlatformError.PlatformError => {
    switch (err.code) {
      case "ENOENT":
        return new PlatformError.SystemError({
          module,
          method,
          reason: "NotFound",
          pathOrDescriptor: args[0],
          cause: err
        })
      
      case "EACCES":
        return new PlatformError.SystemError({
          module,
          method,
          reason: "PermissionDenied",
          pathOrDescriptor: args[0],
          cause: err
        })
      
      case "EEXIST":
        return new PlatformError.SystemError({
          module,
          method,
          reason: "AlreadyExists",
          pathOrDescriptor: args[0],
          cause: err
        })
      
      default:
        return new PlatformError.SystemError({
          module,
          method,
          reason: "Unknown",
          pathOrDescriptor: args[0],
          syscall: err.syscall,
          cause: err
        })
    }
  }

// Usage in effectify
const effectify = <Args extends ReadonlyArray<any>, Return>(
  nodeFunction: (...args: [...Args, (err: any, result: Return) => void]) => void,
  onError: (error: any, args: Args) => PlatformError.PlatformError
) => 
  (...args: Args): Effect.Effect<Return, PlatformError.PlatformError, never> =>
    Effect.async<Return, PlatformError.PlatformError>(resume => {
      nodeFunction(...args, (err, result) => {
        if (err) {
          resume(Effect.fail(onError(err, args)))
        } else {
          resume(Effect.succeed(result))
        }
      })
    })
```

### Standardized Error Reasons
```typescript
// Platform-agnostic error classification
export type SystemErrorReason =
  | "AlreadyExists"
  | "BadResource" 
  | "Busy"
  | "InvalidData"
  | "NotFound"
  | "PermissionDenied"
  | "TimedOut"
  | "UnexpectedEof"
  | "Unknown"
  | "WouldBlock"
  | "WriteZero"

// HTTP-specific error reasons
export type HttpErrorReason =
  | "BadRequest"
  | "Unauthorized"
  | "Forbidden"
  | "NotFound"
  | "InternalServerError"
  | "BadGateway"
  | "ServiceUnavailable"
```

## 🔗 LAYER COMPOSITION PATTERNS

### Service Aggregation
Combine related services into unified layers:

```typescript
// packages/platform-node/src/NodeServices.ts
export const layer: Layer.Layer<
  FileSystem.FileSystem | Path.Path
> = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer
)

// HTTP server with all dependencies
export const layerHttpServices: Layer.Layer<
  | FileSystem.FileSystem
  | Path.Path
  | HttpPlatform.HttpPlatform
  | Etag.Generator
> = Layer.mergeAll(
  NodeHttpPlatform.layer,
  Etag.layerWeak,
  NodeServices.layer
)
```

### Test Layer Pattern
Provide test-specific implementations:

```typescript
// Test layers for consistent testing
export const layerTest: Layer.Layer<
  | HttpServer.HttpServer
  | FileSystem.FileSystem
  | Path.Path
  | HttpPlatform.HttpPlatform
  | Etag.Generator
  | HttpClient.HttpClient,
  ServeError,
  never
> = HttpServer.layerTestClient.pipe(
  Layer.provide(Layer.fresh(FetchHttpClient.layer)),
  Layer.provideMerge(layer(Http.createServer, { port: 0 }))
)

// In-memory file system for testing
export const layerMemoryFileSystem: Layer.Layer<FileSystem.FileSystem> =
  Layer.succeed(FileSystem.FileSystem, makeMemoryFileSystem())
```

## 🌊 STREAM INTEGRATION PATTERNS

### Node.js Stream Conversion
Convert Node.js streams to Effect streams:

```typescript
// packages/platform-node/src/NodeStream.ts
export const fromReadable = <E = Error>(
  evaluate: LazyArg<NodeReadable>,
  onError?: (error: unknown) => E
): Stream.Stream<Uint8Array, E, never> =>
  Stream.asyncEffect<Uint8Array, E, never>(emit => 
    Effect.gen(function* () {
      const readable = evaluate()
      
      yield* Effect.addFinalizer(() => 
        Effect.sync(() => {
          readable.destroy()
        })
      )
      
      readable.on("data", chunk => {
        emit.single(new Uint8Array(chunk))
      })
      
      readable.on("end", () => {
        emit.end()
      })
      
      readable.on("error", error => {
        emit.fail(onError ? onError(error) : error as E)
      })
      
      return Effect.void
    })
  )

// HTTP response body as stream
export class NodeHttpClientResponse implements HttpClientResponse.HttpClientResponse {
  constructor(
    private readonly source: NodeIncomingMessage,
    private readonly request: HttpClientRequest.HttpClientRequest
  ) {}
  
  get stream(): Stream.Stream<Uint8Array, HttpClientError.ResponseError> {
    return NodeStream.fromReadable({
      evaluate: () => this.source,
      onError: (cause) =>
        new HttpClientError.ResponseError({
          request: this.request,
          response: this,
          reason: "Decode",
          cause
        })
    })
  }
}
```

## 🔐 RESOURCE MANAGEMENT PATTERNS

### Scoped Resource Acquisition
Proper cleanup using Effect's Scope system:

```typescript
// HTTP Server with automatic cleanup
export const make = Effect.fnUntraced(function*(
  evaluate: LazyArg<NodeHttp.Server>,
  options: Net.ListenOptions
) {
  const scope = yield* Effect.scope
  const server = evaluate()
  
  // Ensure server is closed when scope closes
  yield* Scope.addFinalizer(
    scope,
    Effect.promise(() => new Promise<void>((resolve, reject) => {
      if (!server.listening) return resolve()
      server.close(error => error ? reject(error) : resolve())
    }))
  )
  
  // Start the server
  yield* Effect.async<void, ServeError>(resume => {
    server.on("error", cause => 
      resume(Effect.fail(new ServeError({ cause })))
    )
    
    server.listen(options, () => resume(Effect.void))
    
    return Effect.sync(() => {
      server.removeAllListeners()
    })
  })
  
  return HttpServer.make({
    address: { _tag: "TcpAddress", hostname: "localhost", port: options.port },
    serve: handler => serveEffect(server, handler)
  })
})
```

### Connection Pool Pattern
Managed resource pools for expensive resources:

```typescript
// Database connection pool example
const makeConnectionPool = (config: PoolConfig) =>
  Effect.gen(function* () {
    const pool = yield* Pool.make({
      acquire: createConnection(config.connectionString),
      size: config.poolSize
    })
    
    return {
      withConnection: <A, E, R>(
        operation: (conn: Connection) => Effect.Effect<A, E, R>
      ): Effect.Effect<A, E | PoolError, R> =>
        Pool.get(pool).pipe(
          Effect.flatMap(operation),
          Effect.scoped
        )
    }
  })
```

## 🧪 TESTING PATTERNS

### Platform Service Mocking
```typescript
// Mock implementations for testing
const mockFileSystem: FileSystem.FileSystem = {
  [FileSystem.TypeId]: FileSystem.TypeId,
  
  access: () => Effect.void,
  
  readFile: (path: string) => {
    const mockFiles: Record<string, string> = {
      "/test.txt": "test content",
      "/config.json": JSON.stringify({ key: "value" })
    }
    
    return path in mockFiles
      ? Effect.succeed(new TextEncoder().encode(mockFiles[path]))
      : Effect.fail(new PlatformError.SystemError({
          module: "FileSystem",
          method: "readFile",
          reason: "NotFound",
          pathOrDescriptor: path
        }))
  },
  
  // ... other mocked methods
}

// Test layer with mocks
export const testLayer: Layer.Layer<FileSystem.FileSystem> =
  Layer.succeed(FileSystem.FileSystem, mockFileSystem)
```

### Cross-Platform Testing
```typescript
// Test that works across all platforms
describe("FileSystem", () => {
  it.effect("should read and write files", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const testData = new TextEncoder().encode("test content")
      
      yield* fs.writeFile("/tmp/test.txt", testData)
      const content = yield* fs.readFile("/tmp/test.txt")
      
      assert.deepStrictEqual(content, testData)
    }).pipe(
      Effect.provide(NodeFileSystem.layer) // Can be swapped for other platforms
    ))
})
```

## 🎯 SUCCESS CRITERIA

### Well-Integrated Platform Code Checklist
- [ ] Clean service interfaces in core Effect package
- [ ] Platform-specific implementations in separate packages
- [ ] Consistent error handling with structured error types
- [ ] Proper resource management with automatic cleanup
- [ ] Stream integration for async operations
- [ ] Layer composition for service aggregation
- [ ] Test layers for consistent testing
- [ ] Cross-platform compatibility considerations
- [ ] Performance optimizations where platform allows
- [ ] Documentation showing platform-specific usage patterns

This platform integration approach ensures clean separation of concerns while providing a unified API across different runtime environments.