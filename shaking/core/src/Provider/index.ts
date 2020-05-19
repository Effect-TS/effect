import { Provider } from "../Support/Common/effect"

export type CombineNeeds<N, P, N2> = N & P extends P & infer Q ? Q & N2 : N & P & N2

export class CombineProviders<Need, Prov, AddE, Op> {
  constructor(private readonly f?: any) {
    this.with = this.with.bind(this)
    this.done = this.done.bind(this)
  }

  with<Need2, Prov2, Err2, Op2>(
    _: Provider<Need2, Prov2, Err2, Op2>
  ): CombineProviders<
    CombineNeeds<Need, Prov2, Need2>,
    Prov & Prov2,
    AddE | Err2,
    Op | Op2
  > {
    return new CombineProviders((x: any) => (_ as any)(this.f(x))) as any
  }

  done(): Provider<Need, Prov, AddE, Op> {
    return this.f
  }
}

export { Provider }

export function combine() {
  return new CombineProviders<unknown, unknown, never, never>((x: any) => x)
}
