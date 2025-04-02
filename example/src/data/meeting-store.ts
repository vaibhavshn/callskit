import { create } from 'zustand';

type Sidebar = 'chat' | 'participants' | undefined;

export type MeetingStore = {
	sidebar: Sidebar;
	setSidebar: (sidebar: Sidebar) => void;
};

export const useMeetingStore = create<MeetingStore>((set) => ({
	sidebar: undefined,
	setSidebar: (sidebar: Sidebar) => set({ sidebar }),
}));
