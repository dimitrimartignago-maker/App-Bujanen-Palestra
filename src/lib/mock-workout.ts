import type { WeekPlan } from '@/types/workout'

const PLANS: WeekPlan[] = [
  {
    weekOffset: 0,
    days: [
      {
        dayIndex: 0, // Monday
        exercises: [
          {
            id: 1,
            name: 'Bench Press',
            notes: 'Pause 1s at chest',
            sets: [
              { id: 1, targetWeight: 80, targetReps: 5 },
              { id: 2, targetWeight: 80, targetReps: 5 },
              { id: 3, targetWeight: 80, targetReps: 5 },
            ],
          },
          {
            id: 2,
            name: 'Incline Dumbbell Press',
            sets: [
              { id: 4, targetWeight: 32, targetReps: 10 },
              { id: 5, targetWeight: 32, targetReps: 10 },
              { id: 6, targetWeight: 32, targetReps: 10 },
            ],
          },
          {
            id: 3,
            name: 'Tricep Pushdown',
            notes: 'Cable, rope attachment',
            sets: [
              { id: 7, targetWeight: 25, targetReps: 12 },
              { id: 8, targetWeight: 25, targetReps: 12 },
              { id: 9, targetWeight: 25, targetReps: 12 },
            ],
          },
        ],
      },
      {
        dayIndex: 1, // Tuesday
        exercises: [
          {
            id: 4,
            name: 'Pull-up',
            notes: 'Full range of motion',
            sets: [
              { id: 10, targetWeight: null, targetReps: 8 },
              { id: 11, targetWeight: null, targetReps: 8 },
              { id: 12, targetWeight: null, targetReps: 8 },
            ],
          },
          {
            id: 5,
            name: 'Barbell Row',
            sets: [
              { id: 13, targetWeight: 70, targetReps: 8 },
              { id: 14, targetWeight: 70, targetReps: 8 },
              { id: 15, targetWeight: 70, targetReps: 8 },
            ],
          },
          {
            id: 6,
            name: 'Dumbbell Bicep Curl',
            sets: [
              { id: 16, targetWeight: 16, targetReps: 12 },
              { id: 17, targetWeight: 16, targetReps: 12 },
              { id: 18, targetWeight: 16, targetReps: 12 },
            ],
          },
        ],
      },
      {
        dayIndex: 3, // Thursday
        exercises: [
          {
            id: 7,
            name: 'Back Squat',
            notes: 'Belt on sets 2 and 3',
            sets: [
              { id: 19, targetWeight: 100, targetReps: 5 },
              { id: 20, targetWeight: 100, targetReps: 5 },
              { id: 21, targetWeight: 100, targetReps: 5 },
            ],
          },
          {
            id: 8,
            name: 'Leg Press',
            sets: [
              { id: 22, targetWeight: 180, targetReps: 10 },
              { id: 23, targetWeight: 180, targetReps: 10 },
              { id: 24, targetWeight: 180, targetReps: 10 },
            ],
          },
          {
            id: 9,
            name: 'Romanian Deadlift',
            sets: [
              { id: 25, targetWeight: 80, targetReps: 10 },
              { id: 26, targetWeight: 80, targetReps: 10 },
              { id: 27, targetWeight: 80, targetReps: 10 },
            ],
          },
        ],
      },
      {
        dayIndex: 4, // Friday
        exercises: [
          {
            id: 10,
            name: 'Overhead Press',
            sets: [
              { id: 28, targetWeight: 55, targetReps: 6 },
              { id: 29, targetWeight: 55, targetReps: 6 },
              { id: 30, targetWeight: 55, targetReps: 6 },
            ],
          },
          {
            id: 11,
            name: 'Lateral Raise',
            notes: 'Slow on the way down',
            sets: [
              { id: 31, targetWeight: 10, targetReps: 15 },
              { id: 32, targetWeight: 10, targetReps: 15 },
              { id: 33, targetWeight: 10, targetReps: 15 },
            ],
          },
          {
            id: 12,
            name: 'Face Pull',
            notes: 'Cable, rope at eye level',
            sets: [
              { id: 34, targetWeight: 20, targetReps: 15 },
              { id: 35, targetWeight: 20, targetReps: 15 },
              { id: 36, targetWeight: 20, targetReps: 15 },
            ],
          },
        ],
      },
    ],
  },
  {
    weekOffset: -1,
    days: [
      {
        dayIndex: 0,
        exercises: [
          {
            id: 101,
            name: 'Bench Press',
            notes: 'Pause 1s at chest',
            sets: [
              { id: 101, targetWeight: 77.5, targetReps: 5 },
              { id: 102, targetWeight: 77.5, targetReps: 5 },
              { id: 103, targetWeight: 77.5, targetReps: 5 },
            ],
          },
          {
            id: 102,
            name: 'Incline Dumbbell Press',
            sets: [
              { id: 104, targetWeight: 30, targetReps: 10 },
              { id: 105, targetWeight: 30, targetReps: 10 },
              { id: 106, targetWeight: 30, targetReps: 10 },
            ],
          },
        ],
      },
      {
        dayIndex: 3,
        exercises: [
          {
            id: 103,
            name: 'Back Squat',
            sets: [
              { id: 107, targetWeight: 97.5, targetReps: 5 },
              { id: 108, targetWeight: 97.5, targetReps: 5 },
              { id: 109, targetWeight: 97.5, targetReps: 5 },
            ],
          },
        ],
      },
    ],
  },
  {
    weekOffset: 1,
    days: [
      {
        dayIndex: 0,
        exercises: [
          {
            id: 201,
            name: 'Bench Press',
            notes: 'Pause 1s at chest',
            sets: [
              { id: 201, targetWeight: 82.5, targetReps: 5 },
              { id: 202, targetWeight: 82.5, targetReps: 5 },
              { id: 203, targetWeight: 82.5, targetReps: 5 },
            ],
          },
          {
            id: 202,
            name: 'Incline Dumbbell Press',
            sets: [
              { id: 204, targetWeight: 34, targetReps: 10 },
              { id: 205, targetWeight: 34, targetReps: 10 },
              { id: 206, targetWeight: 34, targetReps: 10 },
            ],
          },
        ],
      },
      {
        dayIndex: 2,
        exercises: [
          {
            id: 203,
            name: 'Back Squat',
            sets: [
              { id: 207, targetWeight: 102.5, targetReps: 5 },
              { id: 208, targetWeight: 102.5, targetReps: 5 },
              { id: 209, targetWeight: 102.5, targetReps: 5 },
            ],
          },
          {
            id: 204,
            name: 'Leg Press',
            sets: [
              { id: 210, targetWeight: 185, targetReps: 10 },
              { id: 211, targetWeight: 185, targetReps: 10 },
              { id: 212, targetWeight: 185, targetReps: 10 },
            ],
          },
        ],
      },
    ],
  },
]

export function getWeekPlan(weekOffset: number): WeekPlan {
  return (
    PLANS.find((p) => p.weekOffset === weekOffset) ?? {
      weekOffset,
      days: [],
    }
  )
}
