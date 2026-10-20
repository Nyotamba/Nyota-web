import { db } from './db';
import { useDbQuery } from './useDb';
import { BUILTIN_OPTIONS } from '../config/constants';

/** Roles, sectors and languages for chips and filters, from the admin-managed lists. */
export function useProfileOptions() {
  const { data: functions = BUILTIN_OPTIONS.function } = useDbQuery(() => db.listOptions('function'));
  const { data: sectors = BUILTIN_OPTIONS.sector } = useDbQuery(() => db.listOptions('sector'));
  const { data: languages = BUILTIN_OPTIONS.language } = useDbQuery(() => db.listOptions('language'));
  return { functions, sectors, languages };
}
