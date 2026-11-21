import { create } from "zustand";
import { api, type User } from "./api";
export const useSession = create<{ user: User | null; set: (u: User | null) => void }>((set) => ({ user: api.session(), set: (user) => set({ user }) }));
