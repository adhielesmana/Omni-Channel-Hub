import { query } from "./client";

function escapeIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function selectAll<T = any>(
  table: string,
  orderBy?: { column: string; dir: "ASC" | "DESC" },
): Promise<T[]> {
  let sql = `SELECT * FROM ${escapeIdent(table)}`;
  if (orderBy) {
    sql += ` ORDER BY ${escapeIdent(orderBy.column)} ${orderBy.dir}`;
  }
  return query<T>(sql);
}

export async function selectById<T = any>(
  table: string,
  id: number,
): Promise<T | null> {
  const rows = await query<T>(
    `SELECT * FROM ${escapeIdent(table)} WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insert<T = any>(
  table: string,
  data: Record<string, unknown>,
): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const cols = keys.map((k) => escapeIdent(k));
  const sql = `INSERT INTO ${escapeIdent(table)} (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
  const rows = await query<T>(sql, values);
  return rows[0];
}

export async function insertMany<T = any>(
  table: string,
  data: Record<string, unknown>[],
): Promise<T[]> {
  if (data.length === 0) return [];
  const keys = Object.keys(data[0]!);
  const cols = keys.map((k) => escapeIdent(k));
  const rows: unknown[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;
  for (const row of data) {
    const rowPlaceholders = keys.map(() => `$${paramIndex++}`);
    placeholders.push(`(${rowPlaceholders.join(", ")})`);
    for (const key of keys) {
      rows.push(row[key]);
    }
  }
  const sql = `INSERT INTO ${escapeIdent(table)} (${cols.join(", ")}) VALUES ${placeholders.join(", ")} RETURNING *`;
  return query<T>(sql, rows);
}

export async function update<T = any>(
  table: string,
  id: number,
  data: Record<string, unknown>,
): Promise<T | null> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys
    .map((key, i) => `${escapeIdent(key)} = $${i + 1}`)
    .join(", ");
  const sql = `UPDATE ${escapeIdent(table)} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
  const rows = await query<T>(sql, [...values, id]);
  return rows[0] ?? null;
}

export async function del<T = { id: number }>(
  table: string,
  id: number,
): Promise<T | null> {
  const rows = await query<T>(
    `DELETE FROM ${escapeIdent(table)} WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}

export async function selectWhere<T = any>(
  table: string,
  conditions: Record<string, unknown>,
): Promise<T[]> {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys
    .map((key, i) => `${escapeIdent(key)} = $${i + 1}`)
    .join(" AND ");
  return query<T>(
    `SELECT * FROM ${escapeIdent(table)} WHERE ${whereClause}`,
    values,
  );
}

export async function selectRaw<T = any>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  return query<T>(sql, params);
}

export async function count(
  table: string,
  conditions?: Record<string, unknown>,
): Promise<number> {
  if (!conditions || Object.keys(conditions).length === 0) {
    const rows = await query<{ count: string }>(
      `SELECT count(*)::int AS count FROM ${escapeIdent(table)}`,
    );
    return Number(rows[0]!.count);
  }
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys
    .map((key, i) => `${escapeIdent(key)} = $${i + 1}`)
    .join(" AND ");
  const rows = await query<{ count: string }>(
    `SELECT count(*)::int AS count FROM ${escapeIdent(table)} WHERE ${whereClause}`,
    values,
  );
  return Number(rows[0]!.count);
}
