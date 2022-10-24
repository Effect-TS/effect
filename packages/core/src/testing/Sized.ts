import { Tag } from "@fp-ts/data/Context"

/**
 * @tsplus type effect/core/testing/Sized
 * @category model
 * @since 1.0.0
 */
export interface Sized {
  readonly size: Effect<never, never, number>
  readonly withSize: (size: number) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  readonly withSizeGen: (size: number) => <R, A>(gen: Gen<R, A>) => Gen<R, A>
}

/**
 * @tsplus type effect/core/testing/Sized.Ops
 * @category model
 * @since 1.0.0
 */
export interface SizedOps {
  readonly Tag: Tag<Sized>
}
export const Sized: SizedOps = {
  Tag: Tag<Sized>()
}

/**
 * @tsplus type effect/core/testing/Sized.Aspects
 * @category model
 * @since 1.0.0
 */
export interface SizedAspects {}

/**
 * @tsplus static effect/core/testing/Sized.Ops live
 * @category environment
 * @since 1.0.0
 */
export function live(size: number): Layer<never, never, Sized> {
  return Layer.scoped(
    Sized.Tag,
    FiberRef.make(size).map((fiberRef): Sized => ({
      size: fiberRef.get,
      withSize: (size) => fiberRef.locally(size),
      withSizeGen: (size) =>
        (gen) =>
          Gen(
            Stream.fromEffect(fiberRef.get).flatMap((oldSize) =>
              Stream.scoped(fiberRef.locallyScoped(size))
                .crossRight(gen.sample.mapEffect((a) => fiberRef.set(oldSize).as(a)))
            )
          )
    }))
  )
}

/**
 * @tsplus static effect/core/testing/Sized.Ops default
 * @category constructors
 * @since 1.0.0
 */
export const defaultSized: Layer<never, never, Sized> = Sized.live(100)

/**
 * @tsplus static effect/core/testing/Sized.Ops size
 * @category getters
 * @since 1.0.0
 */
export const size: Effect<Sized, never, number> = Effect.serviceWithEffect(
  Sized.Tag,
  (sized) => sized.size
)

/**
 * @tsplus static effect/core/testing/Sized.Ops withSize
 * @category aspects
 * @since 1.0.0
 */
export function withSize(size: number) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R | Sized, E, A> =>
    Effect.serviceWithEffect(
      Sized.Tag,
      (sized) => sized.withSize(size)(effect)
    )
}

/**
 * @tsplus static effect/core/testing/Sized.Ops withSizeGen
 * @category aspects
 * @since 1.0.0
 */
export function withSizeGen(size: number) {
  return <R, A>(gen: Gen<R, A>): Gen<R | Sized, A> =>
    Gen.fromEffect(Effect.service(Sized.Tag)).flatMap((sized) => sized.withSizeGen(size)(gen))
}
