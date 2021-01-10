// copyright https://github.com/frptools

// eslint-disable-next-line prefer-const

let SENTINEL: ChangeFlag

/**
 * Designed to be used while applying changes to certain types of persistent structures. Often the
 * details about whether anything internal was actually changed cannot be determined until after a
 * new structure has been created, and sometimes the magnitude of the change needs to be captured as
 * well, usually for updating the stored size of the structure, for fast lookup. If after performing
 * one or more operations no change has been confirmed, the original structure can be returned and
 * the newly-created instances, to which changes would have been applied, can be discarded.
 *
 * `ChangeFlag` is designed to be used temporarily and then released so that it can be cached for
 * efficient reuse, thus avoiding a lot of unnecessary additional object allocations while
 * operations are being performed.
 */
export class ChangeFlag {
  private static _cache: ChangeFlag

  static get(): ChangeFlag {
    let next = ChangeFlag._cache
    if (next === SENTINEL) {
      next = new ChangeFlag()
    } else {
      ChangeFlag._cache = next._parent
      next.confirmed = false
      next.delta = 0
    }
    return next
  }

  constructor() {
    this._parent = SENTINEL
  }

  private _parent: ChangeFlag

  public confirmed = false
  public delta = 0

  public inc() {
    this.confirmed = true
    this.delta++
  }

  public dec() {
    this.confirmed = true
    this.delta--
  }

  release(): void
  release<T>(modified: T, original: T): T
  release<T>(modified?: T, original?: T): T {
    const value = this.confirmed ? modified : original
    this._parent = ChangeFlag._cache
    ChangeFlag._cache = this
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return value!
  }

  reset(): void {
    this.confirmed = false
    this.delta = 0
  }
}

SENTINEL = new ChangeFlag()
;(<any>SENTINEL)._parent = SENTINEL
;(<any>ChangeFlag)._cache = SENTINEL
