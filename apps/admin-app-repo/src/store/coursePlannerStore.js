/* eslint-disable no-unused-vars */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const coursePlannerStore = create(
  persist(
    (set) => ({
      matchingstate: "",
      stateassociations: [],
      framedata: [],
      boards: [],
      taxanomySubject: "",
      setMatchingstate: (newMatchingstate) =>
        set((state) => ({ matchingstate: newMatchingstate })),
      setStateassociations: (newStateassociations) =>
        set((state) => ({ stateassociations: newStateassociations })),
      setFramedata: (newFramedata) =>
        set((state) => ({ framedata: newFramedata })),
      setBoards: (newBoards) =>
        set((state) => ({ boards: newBoards })),
      setTaxanomySubject: (newTaxanomySubject) =>
        set((state) => ({ taxanomySubject: newTaxanomySubject})),
    }),
    {
      name: "adminApp",
      storage: typeof window !== 'undefined' ? localStorage : undefined,
    }
  )
);

export default coursePlannerStore;
