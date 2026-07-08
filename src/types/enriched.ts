import type { Mitgliedsbeitraege } from './app';

export type EnrichedMitgliedsbeitraege = Mitgliedsbeitraege & {
  mitgliedName: string;
};
