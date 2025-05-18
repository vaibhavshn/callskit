import { create } from 'zustand';

type Sidebar = 'chat' | 'participants' | undefined;

export type MeetingStore = {
	sidebar: Sidebar;
	setSidebar: (sidebar: Sidebar) => void;

	settingsOpen: boolean;
	setSettingsOpen: (settings: boolean) => void;
};

export const useMeetingStore = create<MeetingStore>((set) => ({
	sidebar: undefined,
	setSidebar: (sidebar: Sidebar) => set({ sidebar }),

	settingsOpen: false,
	setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
