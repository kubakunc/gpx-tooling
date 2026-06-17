/** A debounced function with a `cancel` to drop any pending call. */
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

/**
 * Returns a debounced wrapper of `fn`: within any `ms` window only the last
 * call's arguments are used, fired once the window goes quiet. `cancel()` drops
 * a pending call. Uses `setTimeout`/`clearTimeout` (works in DOM + node test env).
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: A): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
