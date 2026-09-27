import * as baseline from './20260924_083051_v1_baseline'
import * as v2 from './20260924_090000_v2_student_workflows'
export const migrations = [
  { name: '20260924_083051_v1_baseline', up: baseline.up, down: baseline.down },
  { name: '20260924_090000_v2_student_workflows', up: v2.up, down: v2.down },
]
