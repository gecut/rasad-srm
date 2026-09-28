import * as migration_20260928_202718_baseline from './20260928_202718_baseline';

export const migrations = [
  {
    up: migration_20260928_202718_baseline.up,
    down: migration_20260928_202718_baseline.down,
    name: '20260928_202718_baseline'
  },
];
