export function requiredString(val: unknown, field: string): string {
  if (typeof val !== "string" || val.trim().length === 0) {
    throw new Error(`${field} is required and must be a non-empty string`);
  }
  return val.trim();
}

export function optionalString(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val !== "string") {
    throw new Error("Expected a string or null/undefined");
  }
  return val.trim();
}

export function requiredNumber(val: unknown, field: string): number {
  if (typeof val === "string") {
    const parsed = Number(val);
    if (isNaN(parsed)) {
      throw new Error(`${field} must be a valid number`);
    }
    return parsed;
  }
  if (typeof val !== "number" || isNaN(val)) {
    throw new Error(`${field} must be a valid number`);
  }
  return val;
}

export function optionalNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  return requiredNumber(val, "optionalNumber");
}

export function requiredEnum<T>(
  val: unknown,
  values: readonly T[],
  field: string,
): T {
  if (!values.includes(val as T)) {
    const valid = values.map((v) => `"${String(v)}"`).join(", ");
    throw new Error(`${field} must be one of: ${valid}`);
  }
  return val as T;
}

export function optionalEnum<T>(
  val: unknown,
  values: readonly T[],
): T | null {
  if (val === null || val === undefined || val === "") return null;
  return requiredEnum(val, values, "optionalEnum");
}

export function requiredBoolean(val: unknown, field: string): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === "1") return true;
  if (val === "false" || val === "0") return false;
  throw new Error(`${field} must be a boolean`);
}

export function optionalBoolean(val: unknown): boolean | null {
  if (val === null || val === undefined || val === "") return null;
  return requiredBoolean(val, "optionalBoolean");
}

export function requiredObject<T extends Record<string, unknown>>(
  val: unknown,
  field: string,
): T {
  if (typeof val !== "object" || val === null || Array.isArray(val)) {
    throw new Error(`${field} must be a non-null object`);
  }
  return val as T;
}

export function optionalObject<T extends Record<string, unknown>>(
  val: unknown,
): T | null {
  if (val === null || val === undefined || val === "") return null;
  return requiredObject<T>(val, "optionalObject");
}

export function requiredArray<T>(
  val: unknown,
  field: string,
): T[] {
  if (!Array.isArray(val)) {
    throw new Error(`${field} must be an array`);
  }
  return val as T[];
}

export function optionalArray<T>(val: unknown): T[] | null {
  if (val === null || val === undefined || val === "") return null;
  return requiredArray<T>(val, "optionalArray");
}
