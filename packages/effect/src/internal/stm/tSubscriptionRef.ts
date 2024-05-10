import * as Effect from "../../Effect.js"
import { dual, pipe } from "../../Function.js"
import * as Option from "../../Option.js"
import { pipeArguments } from "../../Pipeable.js"
import * as STM from "../../STM.js"
import * as TPubSub from "../../TPubSub.js"
import * as TQueue from "../../TQueue.js"
import * as TRef from "../../TRef.js"
import type * as TSubscriptionRef from "../../TSubscriptionRef.js"
import * as stream from "../stream.js"

/** @internal */
const TSubscriptionRefSymbolKey = "effect/TSubscriptionRef"

/** @internal */
export const TSubscriptionRefTypeId: TSubscriptionRef.TSubscriptionRefTypeId = Symbol.for(
  TSubscriptionRefSymbolKey
) as TSubscriptionRef.TSubscriptionRefTypeId

const TSubscriptionRefVariance = {
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
class TSubscriptionRefImpl<in out A> implements TSubscriptionRef.TSubscriptionRef<A> {
  readonly [TSubscriptionRefTypeId] = TSubscriptionRefVariance
  constructor(
    readonly ref: TRef.TRef<A>,
    readonly pubsub: TPubSub.TPubSub<A>
  ) {
  }
  
  pipe() {
    return pipeArguments(this, arguments)
  }
  
  get changes(): STM.STM<TQueue.TQueue<A>>{
    return STM.flatMap(TQueue.unbounded<A>(), queue => pipe(
      STM.flatMap(TRef.get(this.ref), a => TQueue.offer(queue, a)),
      STM.flatMap(() => TPubSub.subscribe(this.pubsub)),
      STM.flatMap(dequeue => pipe(
          TQueue.poll(dequeue),
          STM.tap(a => Option.isNone(a) ? TQueue.shutdown(dequeue) : TQueue.offer(queue, a.value)),
      )),
      STM.as(queue)
    ))
    // return TPubSub.subscribe(this.pubsub)
    // return STM.flatMap(TQueue.unbounded<A>(), queue => pipe(
    //   STM.flatMap(TRef.get(this.ref), a => TQueue.offer(queue, a)),
    //     STM.flatMap(() => TPubSub.subscribe(this.pubsub)),
    //     STM.flatMap(dequeue => pipe(
    //       TQueue.takeAll(dequeue),
    //       STM.tap(as => TQueue.offerAll(queue, as)),
    //       STM.map(() => queue)
    //     ))
    //   ))
    // return pipe(
    //   TRef.get(this.ref),
    //   STM.flatMap(a =>
    //     pipe(
    //       TPubSub.subscribe(this.pubsub),
    //       STM.flatMap(dequeue => pipe(
    //         TQueue.unbounded<A>(),
    //         STM.flatMap(queue => pipe(
    //           TQueue.offer(queue, a),
    //           STM.flatMap(() => TQueue.takeAll(dequeue)),
    //           STM.tap(as => TQueue.offerAll(queue, as)),
    //           STM.map(() => queue)
    //         ))
    //       ))
    //     )
    //   )
    // )
    // return pipe(
    //   TRef.get(this.ref),
    //   Effect.flatMap((a) =>
    //     Effect.map(
    //       streamInternal.fromTPubSub(this.pubsub, { scoped: true }),
    //       (s) =>
    //         streamInternal.concat(
    //           streamInternal.make(a),
    //           s
    //         )
    //     )
    //   ),
    //   streamInternal.unwrapScoped
    // )
  }

  modify<B>(f: (a: A) => readonly [B, A]): STM.STM<B> {
    return pipe(
      TRef.get(this.ref),
      STM.map(f),
      STM.flatMap(([b, a]) =>
        pipe(
          TRef.set(this.ref, a),
          STM.as(b),
          STM.zipLeft(TPubSub.publish(this.pubsub, a))
        )
      )
    )
  }
}

/** @internal */
export const make = <A>(value: A): STM.STM<TSubscriptionRef.TSubscriptionRef<A>> =>
  pipe(
    STM.all([
      TPubSub.unbounded<A>(),
      TRef.make(value)
    ]),
    STM.map(([pubsub, ref]) => new TSubscriptionRefImpl(ref, pubsub))
  )

/** @internal */
export const get = <A>(self: TSubscriptionRef.TSubscriptionRef<A>) => TRef.get(self.ref)

/** @internal */
export const set = dual<
  <A>(value: A) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<void>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, value: A) => STM.STM<void>
>(
  2,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, value: A): STM.STM<void> =>
    self.modify((): [void, A] => [void 0, value])
)

/** @internal */
export const getAndSet = dual<
  <A>(value: A) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<A>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, value: A) => STM.STM<A>
>(2, (self, value) => self.modify((a) => [a, value]))

/** @internal */
export const getAndUpdate = dual<
  <A>(f: (a: A) => A) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<A>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, f: (a: A) => A) => STM.STM<A>
>(2, (self, f) => self.modify((a) => [a, f(a)]))

/** @internal */
export const getAndUpdateSome = dual<
  <A>(f: (a: A) => Option.Option<A>) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<A>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, f: (a: A) => Option.Option<A>) => STM.STM<A>
>(2, (self, f) =>
  self.modify((a) =>
    Option.match(f(a), {
      onNone: () => [a, a],
      onSome: (b) => [a, b]
    })
  ))

/** @internal */
export const setAndGet = dual<
  <A>(value: A) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<A>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, value: A) => STM.STM<A>
>(2, (self, value) => self.modify(() => [value, value]))

/** @internal */
export const modify = dual<
  <A, B>(f: (a: A) => readonly [B, A]) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<B>,
  <A, B>(self: TSubscriptionRef.TSubscriptionRef<A>, f: (a: A) => readonly [B, A]) => STM.STM<B>
>(2, (self, f) => self.modify(f))

/** @internal */
export const modifySome = dual<
  <A, B>(
    fallback: B,
    f: (a: A) => Option.Option<readonly [B, A]>
  ) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<B>,
  <A, B>(
    self: TSubscriptionRef.TSubscriptionRef<A>,
    fallback: B,
    f: (a: A) => Option.Option<readonly [B, A]>
  ) => STM.STM<B>
>(3, (self, fallback, f) =>
  self.modify((a) =>
    Option.match(f(a), {
      onNone: () => [fallback, a],
      onSome: (b) => b
    })
  ))

/** @internal */
export const update = dual<
  <A>(f: (a: A) => A) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<void>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, f: (a: A) => A) => STM.STM<void>
>(2, (self, f) => self.modify((a) => [void 0, f(a)]))

/** @internal */
export const updateAndGet = dual<
  <A>(f: (a: A) => A) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<A>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, f: (a: A) => A) => STM.STM<A>
>(2, (self, f) =>
  self.modify((a) => {
    const b = f(a)
    return [b, b]
  }))

/** @internal */
export const updateSome = dual<
  <A>(f: (a: A) => Option.Option<A>) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<void>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, f: (a: A) => Option.Option<A>) => STM.STM<void>
>(
  2,
  (self, f) =>
    self.modify((a) => [
      void 0,
      Option.match(f(a), {
        onNone: () => a,
        onSome: (b) => b
      })
    ])
)

/** @internal */
export const updateSomeAndGet = dual<
  <A>(f: (a: A) => Option.Option<A>) => (self: TSubscriptionRef.TSubscriptionRef<A>) => STM.STM<A>,
  <A>(self: TSubscriptionRef.TSubscriptionRef<A>, f: (a: A) => Option.Option<A>) => STM.STM<A>
>(
  2,
  (self, f) =>
    self.modify((a) =>
      Option.match(f(a), {
        onNone: () => [a, a],
        onSome: (b) => [b, b]
      })
    )
)

/** @internal */
export const changesScoped = <A>(self: TSubscriptionRef.TSubscriptionRef<A>) =>
  Effect.acquireRelease(
    pipe(
      Effect.flatMap(TQueue.unbounded<A>(), queue =>
        Effect.flatMap(TPubSub.subscribeScoped(self.pubsub), dequeue => pipe(
          STM.flatMap(TRef.get(self.ref), a => TQueue.offer(queue, a)),
          STM.flatMap(() => pipe(
            TQueue.takeAll(dequeue),
            STM.tap(as => TQueue.offerAll(queue, as)),
          )),
          STM.as(queue)
        )
      )),
    ),
    (dequeue) => TQueue.shutdown(dequeue)
  )

/** @internal */
export const changesStream = <A>(self: TSubscriptionRef.TSubscriptionRef<A>) =>
    pipe(
      TRef.get(self.ref),
      Effect.flatMap((a) =>
        Effect.map(
          stream.fromTPubSub(self.pubsub, { scoped: true }),
          (s) =>
            stream.concat(
              stream.make(a),
              s
            )
        )
      ),
      stream.unwrapScoped
)

  //   pipe(
  //   changesScoped(self),
  //   Effect.map(t => stream.fromTQueue(t, { shutdown: true })),
  //   stream.unwrap
  // )
  
//   pipe(
//       TRef.get(self.ref),
//       Effect.flatMap((a) =>
//         Effect.map(
//           stream.fromTPubSub(self.pubsub, { scoped: true }),
//           (s) =>
//             stream.concat(
//               stream.make(a),
//               s
//             )
//         )
//       ),
//       stream.unwrapScoped
// )
