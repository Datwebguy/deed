// Work that can move a trust's money runs one at a time per trust on this
// server, so two quick requests or approvals can't spend the same money twice.
const queues = new Map<string, Promise<unknown>>();
export function oneAtATime<T>(trustId: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(trustId) ?? Promise.resolve()).catch(() => {}).then(fn);
  queues.set(trustId, run);
  run.finally(() => queues.get(trustId) === run && queues.delete(trustId)).catch(() => {});
  return run;
}
