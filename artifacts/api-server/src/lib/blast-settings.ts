export interface BlastSettings {
  batchSize: number;
  delayBetweenBatchesMs: number;
  maxRetries: number;
}

const DEFAULTS: BlastSettings = {
  batchSize: 50,
  delayBetweenBatchesMs: 1000,
  maxRetries: 2,
};

// In-memory store (can be swapped for DB-backed persistence later)
let currentSettings: BlastSettings = { ...DEFAULTS };

export function getBlastSettings(): BlastSettings {
  return { ...currentSettings };
}

export function updateBlastSettings(partial: Partial<BlastSettings>): BlastSettings {
  currentSettings = { ...currentSettings, ...partial };
  return { ...currentSettings };
}

export function resetBlastSettings(): BlastSettings {
  currentSettings = { ...DEFAULTS };
  return { ...currentSettings };
}
