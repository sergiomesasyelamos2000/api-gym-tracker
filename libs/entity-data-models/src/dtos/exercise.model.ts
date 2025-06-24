export interface ExerciseRequestDto {
    name: string;
    description: string;
    type: string;
    duration: number;
    caloriesBurned: number;
    date: Date;
}