export class Pipe<A> {
  constructor(private readonly _: A) {
    this.pipe = this.pipe.bind(this)
    this.done = this.done.bind(this)
  }
  pipe<B>(f: (_: A) => B) {
    return new Pipe(f(this._))
  }
  done(): A {
    return this._
  }
}

export const pipeF = <A>(_: A): Pipe<A> => new Pipe(_)
