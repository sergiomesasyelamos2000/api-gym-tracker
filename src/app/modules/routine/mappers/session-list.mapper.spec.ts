import { mapSessionToListItem } from './routine-contract.mapper';

describe('session list mapper', () => {
  it('strips imageUrl and giftUrl from exercises', () => {
    const mapped = mapSessionToListItem({
      id: 's1',
      routine: { id: 'r1', title: 'Push' },
      totalTime: 60,
      totalWeight: 100,
      completedSets: 2,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      exercises: [
        {
          exerciseId: 'e1',
          name: 'Bench',
          imageUrl: 'data:image/png;base64,AAAA',
          giftUrl: 'data:image/gif;base64,BBBB',
          restSeconds: '90',
          sets: [{ weight: 60, reps: 8, completed: true }],
        },
      ],
    });

    expect(mapped.exercises[0]).toEqual({
      exerciseId: 'e1',
      name: 'Bench',
      restSeconds: '90',
      sets: [{ weight: 60, reps: 8, completed: true }],
    });
    expect((mapped.exercises[0] as any).imageUrl).toBeUndefined();
    expect(mapped.routine).toEqual({ id: 'r1', title: 'Push' });
  });
});
