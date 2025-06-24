export interface RoutineRequestDto {
    name: string;
    description: string;
    exercises: {
        exerciseId: string;
        sets: number;
        reps: number;
    }[];
}