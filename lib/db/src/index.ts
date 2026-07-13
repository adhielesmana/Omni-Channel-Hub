import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { pool } from "./client";

export { pool, query } from "./client";
export {
  selectAll,
  selectById,
  insert,
  insertMany,
  update,
  del,
  selectWhere,
  selectRaw,
  count,
} from "./queries";

export const db = drizzle(pool, { schema });

export * from "./schema";
