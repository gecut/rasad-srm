import * as migration_20260930_133000_baseline from './20260930_133000_baseline'
import * as migration_20261014_130000_student_status_and_class_neighborhood from './20261014_130000_student_status_and_class_neighborhood'

export const migrations = [
  {
    up: migration_20260930_133000_baseline.up,
    down: migration_20260930_133000_baseline.down,
    name: '20260930_133000_baseline',
  },
  {
    up: migration_20261014_130000_student_status_and_class_neighborhood.up,
    down: migration_20261014_130000_student_status_and_class_neighborhood.down,
    name: '20261014_130000_student_status_and_class_neighborhood',
  },
]
