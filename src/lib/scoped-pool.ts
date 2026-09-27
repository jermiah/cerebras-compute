import type { Pool } from "pg";
// Only a fixed internal schema is selectable; no user-supplied SQL identifiers.
export function testPool(pool: Pool): Pool {
  const wrap = (target: object): unknown =>
    new Proxy(target, {
      get(target, key) {
        const value = Reflect.get(target, key);
        if (key === "query")
          return (sql: string, ...args: unknown[]) =>
            value.call(
              target,
              sql.replaceAll("events.", "events_test."),
              ...args,
            );
        if (key === "connect")
          return async () => wrap(await value.call(target));
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  return wrap(pool) as Pool;
}
