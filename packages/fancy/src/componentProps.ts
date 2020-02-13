// alpha
/* istanbul ignore file */

export const componentPropsURI = Symbol();

export interface ComponentProps<P> {
  [componentPropsURI]: {
    props: P;
  };
}
