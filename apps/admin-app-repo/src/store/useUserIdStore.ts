import { create } from "zustand";

interface UserIdState {
  userId: string;
  setUserId: (userId: string) => void;
}

export const useUserIdStore = create<UserIdState>((set) => ({
  userId: "",
  setUserId: (userId: string) => set({ userId }),
}));
