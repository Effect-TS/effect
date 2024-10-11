/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import type { Concurrency } from "effect/Types"
import type { AiError } from "./AiError.js"
import * as AiInput from "./AiInput.js"
import { AiResponse, WithResolved } from "./AiResponse.js"
import type * as AiToolkit from "./AiToolkit.js"
import { Completions } from "./Completions.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class AiChat extends Effect.Tag("@effect/ai/AiChat")<
  AiChat,
  AiChat.Service
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace AiChat {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly history: Effect.Effect<AiInput.AiInput>
    readonly export: Effect.Effect<unknown>
    readonly exportJson: Effect.Effect<string>
    readonly send: (input: AiInput.Input) => Effect.Effect<AiResponse, AiError>
    readonly stream: (input: AiInput.Input) => Stream.Stream<AiResponse, AiError>
    readonly structured: <A, I, R>(
      tool: Completions.StructuredSchema<A, I, R>,
      input: AiInput.Input
    ) => Effect.Effect<A, AiError, R>
    readonly toolkit: <Tools extends AiToolkit.Tool.AnySchema>(
      options: {
        readonly input: AiInput.Input
        readonly tools: AiToolkit.Handlers<Tools>
        readonly required?: Tools["_tag"] | boolean | undefined
        readonly concurrency?: Concurrency | undefined
      }
    ) => Effect.Effect<
      WithResolved<AiToolkit.Tool.Success<Tools>>,
      AiError | AiToolkit.Tool.Failure<Tools>,
      AiToolkit.Tool.Context<Tools>
    >
    readonly toolkitStream: <Tools extends AiToolkit.Tool.AnySchema>(
      options: {
        readonly input: AiInput.Input
        readonly tools: AiToolkit.Handlers<Tools>
        readonly required?: Tools["_tag"] | boolean | undefined
        readonly concurrency?: Concurrency | undefined
      }
    ) => Stream.Stream<
      WithResolved<AiToolkit.Tool.Success<Tools>>,
      AiError | AiToolkit.Tool.Failure<Tools>,
      AiToolkit.Tool.Context<Tools>
    >
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput = (input: AiInput.Input): Effect.Effect<AiChat.Service, never, Completions> =>
  Ref.make(AiInput.make(input)).pipe(
    Effect.bindTo("historyRef"),
    Effect.bind("completions", () => Completions),
    Effect.map(({ completions, historyRef }) => new AiChatImpl(historyRef, completions))
  )

class AiChatImpl implements AiChat.Service {
  readonly semaphore = Effect.unsafeMakeSemaphore(1)

  constructor(
    readonly historyRef: Ref.Ref<AiInput.AiInput>,
    readonly completions: Completions.Service
  ) {}

  get history() {
    return Ref.get(this.historyRef)
  }

  get export() {
    return Ref.get(this.historyRef).pipe(
      Effect.flatMap(Schema.encode(AiInput.Schema)),
      Effect.orDie
    )
  }

  get exportJson() {
    return Ref.get(this.historyRef).pipe(
      Effect.flatMap(Schema.encode(AiInput.SchemaJson)),
      Effect.orDie
    )
  }

  send(input: AiInput.Input) {
    const newParts = AiInput.make(input)
    return Ref.get(this.historyRef).pipe(
      Effect.flatMap((parts) => {
        const allParts = Chunk.appendAll(parts, newParts)
        return this.completions.create(allParts).pipe(
          Effect.tap((response) => {
            const responseParts = AiInput.make(response)
            return Ref.set(this.historyRef, Chunk.appendAll(allParts, responseParts))
          })
        )
      }),
      this.semaphore.withPermits(1),
      Effect.withSpan("AiChat.send", { attributes: { input }, captureStackTrace: false })
    )
  }

  stream(input: AiInput.Input) {
    return Stream.suspend(() => {
      let combined = AiResponse.empty
      return Stream.fromChannel(Channel.acquireUseRelease(
        this.semaphore.take(1).pipe(
          Effect.zipRight(Ref.get(this.historyRef)),
          Effect.map(Chunk.appendAll(AiInput.make(input)))
        ),
        (parts) =>
          this.completions.stream(parts).pipe(
            Stream.map((chunk) => {
              combined = combined.concat(chunk)
              return chunk
            }),
            Stream.toChannel
          ),
        (parts) =>
          Effect.zipRight(
            Ref.set(this.historyRef, Chunk.appendAll(parts, AiInput.make(combined))),
            this.semaphore.release(1)
          )
      ))
    }).pipe(Stream.withSpan("AiChat.stream", { attributes: { input }, captureStackTrace: false }))
  }

  structured<A, I, R>(
    schema: Completions.StructuredSchema<A, I, R>,
    input: AiInput.Input
  ): Effect.Effect<A, AiError, R> {
    const newParts = AiInput.make(input)
    return Ref.get(this.historyRef).pipe(
      Effect.flatMap((parts) => {
        const allParts = Chunk.appendAll(parts, newParts)
        return this.completions.structured({
          input: allParts,
          schema
        }).pipe(
          Effect.flatMap((response) => {
            const responseParts = AiInput.make(response)
            return Effect.as(
              Ref.set(this.historyRef, Chunk.appendAll(allParts, responseParts)),
              response.unsafeValue
            )
          })
        )
      }),
      this.semaphore.withPermits(1),
      Effect.withSpan("AiChat.structured", {
        attributes: { input, schema: schema._tag ?? schema.identifier },
        captureStackTrace: false
      })
    )
  }

  toolkit<Tools extends AiToolkit.Tool.AnySchema>(
    options: {
      readonly input: AiInput.Input
      readonly tools: AiToolkit.Handlers<Tools>
      readonly required?: Tools["_tag"] | boolean | undefined
      readonly concurrency?: Concurrency | undefined
    }
  ): Effect.Effect<
    WithResolved<AiToolkit.Tool.Success<Tools>>,
    AiError | AiToolkit.Tool.Failure<Tools>,
    AiToolkit.Tool.Context<Tools>
  > {
    const newParts = AiInput.make(options.input)
    return Ref.get(this.historyRef).pipe(
      Effect.flatMap((parts) => {
        const allParts = Chunk.appendAll(parts, newParts)
        return this.completions.toolkit({
          ...options,
          input: allParts
        }).pipe(
          Effect.tap((response) => {
            const responseParts = AiInput.make(response)
            return Ref.set(this.historyRef, Chunk.appendAll(allParts, responseParts))
          })
        )
      }),
      this.semaphore.withPermits(1),
      Effect.withSpan("AiChat.toolkit", { attributes: { input: options.input }, captureStackTrace: false })
    )
  }

  toolkitStream<Tools extends AiToolkit.Tool.AnySchema>(
    options: {
      readonly input: AiInput.Input
      readonly tools: AiToolkit.Handlers<Tools>
      readonly required?: Tools["_tag"] | boolean | undefined
      readonly concurrency?: Concurrency | undefined
    }
  ): Stream.Stream<
    WithResolved<AiToolkit.Tool.Success<Tools>>,
    AiError | AiToolkit.Tool.Failure<Tools>,
    AiToolkit.Tool.Context<Tools>
  > {
    return Stream.suspend(() => {
      let combined = WithResolved.empty as WithResolved<AiToolkit.Tool.Success<Tools>>
      return Stream.fromChannel(Channel.acquireUseRelease(
        this.semaphore.take(1).pipe(
          Effect.zipRight(Ref.get(this.historyRef)),
          Effect.map(Chunk.appendAll(AiInput.make(options.input)))
        ),
        (parts) =>
          this.completions.toolkitStream({
            ...options,
            input: parts
          }).pipe(
            Stream.map((chunk) => {
              combined = combined.concat(chunk)
              return chunk
            }),
            Stream.toChannel
          ),
        (parts) =>
          Effect.zipRight(
            Ref.set(this.historyRef, Chunk.appendAll(parts, AiInput.make(combined))),
            this.semaphore.release(1)
          )
      ))
    }).pipe(Stream.withSpan("AiChat.toolkitStream", { attributes: { input: options.input }, captureStackTrace: false }))
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Effect.Effect<AiChat.Service, never, Completions> = fromInput(AiInput.empty)

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromExport = (data: unknown): Effect.Effect<AiChat.Service, ParseError, Completions> =>
  Schema.decodeUnknown(AiInput.Schema)(data).pipe(
    Effect.flatMap(fromInput)
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromJson = (data: string): Effect.Effect<AiChat.Service, ParseError, Completions> =>
  Schema.decode(AiInput.SchemaJson)(data).pipe(
    Effect.flatMap(fromInput)
  )
