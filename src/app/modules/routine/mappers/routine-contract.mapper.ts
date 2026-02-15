import type {
  GlobalRoutineStats,
  RoutineResponse,
  RoutineSession,
} from '@sergiomesasyelamos2000/shared';

const toIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
};

export const mapRoutineToContract = (routine: any): RoutineResponse => ({
  ...routine,
  createdAt: toIso(routine.createdAt),
  updatedAt: toIso(routine.updatedAt),
  routineExercises: Array.isArray(routine.routineExercises)
    ? routine.routineExercises.map((re: any) => ({
        ...re,
        notes: Array.isArray(re.notes)
          ? re.notes.map((note: any) => ({
              ...note,
              createdAt: toIso(note.createdAt),
            }))
          : re.notes,
      }))
    : routine.routineExercises,
});

export const mapRoutineListToContract = (routines: any[]): RoutineResponse[] =>
  routines.map(mapRoutineToContract);

export const mapSessionToContract = (session: any): RoutineSession => ({
  ...session,
  createdAt: toIso(session.createdAt),
});

export const mapSessionListToContract = (sessions: any[]): RoutineSession[] =>
  sessions.map(mapSessionToContract);

export const mapGlobalStatsToContract = (stats: {
  totalTime?: number;
  totalWeight?: number;
  completedSets?: number;
}): GlobalRoutineStats => ({
  totalTime: Number(stats.totalTime || 0),
  totalWeight: Number(stats.totalWeight || 0),
  completedSets: Number(stats.completedSets || 0),
});
