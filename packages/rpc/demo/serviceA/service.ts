import * as T from "@matechs/effect";
import { CanRemote } from "../../src";

export interface ServiceAConfig {
  serviceA: {
    config: {
      prefix: string;
    };
  };
}

export interface ServiceA extends CanRemote {
  serviceA: {
    computeHello(name: string): T.Effect<ServiceAConfig, Error, string>;
  };
}

export const serviceA: ServiceA = {
  serviceA: {
    computeHello(name: string): T.Effect<ServiceAConfig, Error, string> {
      return T.accessM(({ serviceA: { config: { prefix } } }: ServiceAConfig) =>
        T.right(`${prefix}${name}`)
      );
    }
  }
};
