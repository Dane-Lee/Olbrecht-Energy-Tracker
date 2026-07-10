import { PoolCourse, RacePriority } from './enums';
import type { LocalDate, UUID } from './common';

export interface RaceEvent {
  id: UUID;
  athleteId: UUID;
  eventName: string;
  eventDate: LocalDate;
  course: PoolCourse;
  priority: RacePriority;
  targetEvents: readonly string[];
  targetTimes?: Readonly<Record<string, number>>;
  taperStartDate?: LocalDate;
  taperEndDate?: LocalDate;
}
