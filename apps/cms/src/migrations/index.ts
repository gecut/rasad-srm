import * as migration_20260924_083051_v1_baseline from './20260924_083051_v1_baseline';
import * as migration_20260924_090000_v2_student_workflows from './20260924_090000_v2_student_workflows';
import * as migration_20260928_122702_add_import_export_tables from './20260928_122702_add_import_export_tables';

export const migrations = [
  {
    up: migration_20260924_083051_v1_baseline.up,
    down: migration_20260924_083051_v1_baseline.down,
    name: '20260924_083051_v1_baseline',
  },
  {
    up: migration_20260924_090000_v2_student_workflows.up,
    down: migration_20260924_090000_v2_student_workflows.down,
    name: '20260924_090000_v2_student_workflows',
  },
  {
    up: migration_20260928_122702_add_import_export_tables.up,
    down: migration_20260928_122702_add_import_export_tables.down,
    name: '20260928_122702_add_import_export_tables'
  },
];
