import { create } from 'zustand';

type Sidebar = 'chat' | undefined;

export type MeetingStore = {
	sidebar: Sidebar;
	setSidebar: (sidebar: Sidebar) => void;
};

export const useMeetingStore = create<MeetingStore>((set) => ({
	sidebar: undefined,
	setSidebar: (sidebar: Sidebar) => set({ sidebar }),
}));
