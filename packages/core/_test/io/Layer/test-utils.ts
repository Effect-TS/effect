export const acquire1 = "Acquiring Module 1"
export const acquire2 = "Acquiring Module 2"
export const acquire3 = "Acquiring Module 3"
export const release1 = "Releasing Module 1"
export const release2 = "Releasing Module 2"
export const release3 = "Releasing Module 3"

export function makeRef(): Effect<unknown, never, Ref<Chunk<string>>> {
  return Ref.make(Chunk.empty())
}

// -----------------------------------------------------------------------------
// Service 1
// -----------------------------------------------------------------------------

export class Service1 {
  get one(): Effect<unknown, never, number> {
    return Effect.succeedNow(1)
  }
}

export const Service1Tag = Tag<Service1>()

export function makeLayer1(
  ref: Ref<Chunk<string>>
): Layer<unknown, never, Has<Service1>> {
  return Layer.scoped(Service1Tag)(
    Effect.acquireRelease(
      ref.update((_) => _.append(acquire1)).as(new Service1()),
      () => ref.update((_) => _.append(release1))
    )
  )
}

// -----------------------------------------------------------------------------
// Service 2
// -----------------------------------------------------------------------------

export class Service2 {
  get two(): Effect<unknown, never, number> {
    return Effect.succeedNow(2)
  }
}

export const Service2Tag = Tag<Service2>()

export function makeLayer2(
  ref: Ref<Chunk<string>>
): Layer<unknown, never, Has<Service2>> {
  return Layer.scoped(Service2Tag)(
    Effect.acquireRelease(
      ref.update((_) => _.append(acquire2)).as(new Service2()),
      () => ref.update((_) => _.append(release2))
    )
  )
}

// -----------------------------------------------------------------------------
// Service 3
// -----------------------------------------------------------------------------

export class Service3 {
  get three(): Effect<unknown, never, number> {
    return Effect.succeedNow(3)
  }
}

export const Service3Tag = Tag<Service3>()

export function makeLayer3(
  ref: Ref<Chunk<string>>
): Layer<unknown, never, Has<Service3>> {
  return Layer.scoped(Service3Tag)(
    Effect.acquireRelease(
      ref.update((_) => _.append(acquire3)).as(new Service3()),
      () => ref.update((_) => _.append(release3))
    )
  )
}
