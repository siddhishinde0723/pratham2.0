/* eslint-disable no-unused-vars */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const boardEnrollmentStore = create(
  persist(
    (set) => ({
      boardEnrollmentData: '',
      setBoardEnrollmentData: (newBoardEnrollmentData) => set(() => ({ boardEnrollmentData: newBoardEnrollmentData })),
    }),
    {
      name: 'boardEnrollment',
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      // storage: typeof window !== 'undefined' ? localStorage : undefined,
    }
  )
);

export default boardEnrollmentStore;
