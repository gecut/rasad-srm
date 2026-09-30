import * as migration_20260930_133000_baseline from './20260930_133000_baseline'

export const migrations = [
  {
    up: migration_20260930_133000_baseline.up,
    down: migration_20260930_133000_baseline.down,
    name: '20260930_133000_baseline',
  },
]
