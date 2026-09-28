import * as migration_20260924_083051_v1_baseline from './20260924_083051_v1_baseline';
import * as migration_20260924_090000_v2_student_workflows from './20260924_090000_v2_student_workflows';
import * as migration_20260928_122702_add_import_export_tables from './20260928_122702_add_import_export_tables';
import * as migration_20260928_194143_add_neighborhoods_and_student_fields from './20260928_194143_add_neighborhoods_and_student_fields';

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
    name: '20260928_122702_add_import_export_tables',
  },
  {
    up: migration_20260928_194143_add_neighborhoods_and_student_fields.up,
    down: migration_20260928_194143_add_neighborhoods_and_student_fields.down,
    name: '20260928_194143_add_neighborhoods_and_student_fields'
  },
];
