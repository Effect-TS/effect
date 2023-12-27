import * as Headers from "@effect/platform/Http/Headers"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import * as UrlParams from "@effect/platform/Http/UrlParams"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
import type * as Http from "node:http"
import * as NodeStream from "../../Stream.js"

/** @internal */
export class IncomingMessageImpl<E> implements IncomingMessage.IncomingMessage<E> {
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId

  constructor(
    readonly source: Http.IncomingMessage,
    readonly onError: (error: unknown) => E,
    readonly remoteAddressOverride?: string
  ) {
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
  }

  get headers() {
    return Headers.fromInput(this.source.headers as any)
  }

  get remoteAddress() {
    return Option.fromNullable(this.remoteAddressOverride ?? this.source.socket.remoteAddress)
  }

  private textEffect: Effect.Effect<never, E, string> | undefined
  get text(): Effect.Effect<never, E, string> {
    if (this.textEffect) {
      return this.textEffect
    }
    this.textEffect = Effect.runSync(Effect.cached(
      Effect.flatMap(
        FiberRef.get(IncomingMessage.maxBodySize),
        (maxBodySize) =>
          NodeStream.toString(() => this.source, {
            onFailure: this.onError,
            maxBytes: Option.getOrUndefined(maxBodySize)
          })
      )
    ))
    return this.textEffect
  }

  get json(): Effect.Effect<never, E, unknown> {
    return Effect.tryMap(this.text, {
      try: (_) => _ === "" ? null : JSON.parse(_) as unknown,
      catch: this.onError
    })
  }

  get urlParamsBody(): Effect.Effect<never, E, UrlParams.UrlParams> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: this.onError
      }))
  }

  get stream(): Stream.Stream<never, E, Uint8Array> {
    return NodeStream.fromReadable<E, Uint8Array>(
      () => this.source,
      this.onError
    )
  }

  get arrayBuffer(): Effect.Effect<never, E, ArrayBuffer> {
    return Effect.flatMap(
      FiberRef.get(IncomingMessage.maxBodySize),
      (maxBodySize) =>
        NodeStream.toUint8Array(() => this.source, {
          onFailure: this.onError,
          maxBytes: Option.getOrUndefined(maxBodySize)
        })
    )
  }
}
