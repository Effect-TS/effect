export function resource(
  id: number,
  ref: Ref<Chunk<Action>>
): Effect<Has<Scope>, never, number> {
  return ref
    .update((chunk) => chunk.append(Action.Acquire(id)))
    .as(id)
    .uninterruptible()
    .ensuring(
      Effect.scopeWith((scope) => scope.addFinalizer(ref.update((chunk) => chunk.append(Action.Release(id)))))
    );
}

/**
 * @tsplus type ets/Test/Scope/Action
 */
export type Action = Acquire | Use | Release;

/**
 * @tsplus type ets/Test/Scope/ActionOps
 */
export interface ActionOps {}
export const Action: ActionOps = {};

/**
 * @tsplus type ets/Test/Scope/Action/Acquire
 */
export class Acquire implements Equals {
  readonly _tag = "Acquire";

  constructor(readonly id: number) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.number(this.id));
  }

  [Equals.sym](u: unknown): boolean {
    return u instanceof Acquire && u.id === this.id;
  }
}

/**
 * @tsplus type ets/Test/Scope/Action/Use
 */
export class Use implements Equals {
  readonly _tag = "Use";

  constructor(readonly id: number) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.number(this.id));
  }

  [Equals.sym](u: unknown): boolean {
    return u instanceof Use && u.id === this.id;
  }
}

/**
 * @tsplus type ets/Test/Scope/Action/Release
 */
export class Release implements Equals {
  readonly _tag = "Release";

  constructor(readonly id: number) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.number(this.id));
  }

  [Equals.sym](u: unknown): boolean {
    return u instanceof Release && u.id === this.id;
  }
}

/**
 * @tsplus static ets/Test/Scope/ActionOps Acquire
 */
export function acquire(id: number): Action {
  return new Acquire(id);
}

/**
 * @tsplus static ets/Test/Scope/ActionOps Use
 */
export function use(id: number): Action {
  return new Use(id);
}

/**
 * @tsplus static ets/Test/Scope/ActionOps Release
 */
export function release(id: number): Action {
  return new Release(id);
}
