import * as migration_20260929_130513_baseline from './20260929_130513_baseline';

export const migrations = [
  {
    up: migration_20260929_130513_baseline.up,
    down: migration_20260929_130513_baseline.down,
    name: '20260929_130513_baseline'
  },
];
