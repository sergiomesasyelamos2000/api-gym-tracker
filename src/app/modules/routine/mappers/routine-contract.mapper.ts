import type {
  GlobalRoutineStats,
  PaginatedRoutineSessions,
  RoutineFolderResponse,
  RoutineResponse,
  RoutineSession,
  RoutineSessionListItem,
} from '@sergiomesasyelamos2000/shared';

const toIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
};

export const mapRoutineToContract = (routine: any): RoutineResponse => ({
  ...routine,
  folderId: routine.folderId ?? null,
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

export const mapFolderToContract = (
  folder: {
    id: string;
    title: string;
    sortOrder: number;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
  routineIds: string[],
): RoutineFolderResponse => ({
  id: folder.id,
  title: folder.title,
  sortOrder: folder.sortOrder,
  routineIds,
  createdAt: toIso(folder.createdAt),
  updatedAt: toIso(folder.updatedAt),
});

export const mapSessionToContract = (session: any): RoutineSession => ({
  ...session,
  createdAt: toIso(session.createdAt),
});

export const mapSessionListToContract = (sessions: any[]): RoutineSession[] =>
  sessions.map(mapSessionToContract);

/** Strip media blobs from session exercises for list payloads. */
export const mapSessionToListItem = (session: any): RoutineSessionListItem => {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises.map((exercise: any) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        restSeconds: exercise.restSeconds,
        sets: Array.isArray(exercise.sets)
          ? exercise.sets.map((set: any) => ({
              weight: set.weight,
              reps: set.reps,
              completed: set.completed,
              isRecord: set.isRecord,
              setType: set.setType,
            }))
          : [],
      }))
    : [];

  return {
    id: session.id,
    routineId: session.routineId ?? session.routine?.id,
    routine: session.routine
      ? { id: session.routine.id, title: session.routine.title }
      : undefined,
    exercises,
    totalTime: Number(session.totalTime) || 0,
    totalWeight: Number(session.totalWeight) || 0,
    completedSets: Number(session.completedSets) || 0,
    avgHeartRate: session.avgHeartRate ?? null,
    maxHeartRate: session.maxHeartRate ?? null,
    caloriesBurned: session.caloriesBurned ?? null,
    healthMetricsSource: session.healthMetricsSource ?? null,
    createdAt: toIso(session.createdAt),
  };
};

export const mapPaginatedSessionsToContract = (page: {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
}): PaginatedRoutineSessions => ({
  items: page.items.map(mapSessionToListItem),
  nextCursor: page.nextCursor,
  hasMore: page.hasMore,
});

export const mapGlobalStatsToContract = (stats: {
  totalTime?: number;
  totalWeight?: number;
  completedSets?: number;
}): GlobalRoutineStats => ({
  totalTime: Number(stats.totalTime || 0),
  totalWeight: Number(stats.totalWeight || 0),
  completedSets: Number(stats.completedSets || 0),
});
