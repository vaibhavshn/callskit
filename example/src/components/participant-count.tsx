import { PeopleRegular } from '@fluentui/react-icons';
import { useCallSelector } from 'callskit/react';
import { useMeetingStore } from '../data/meeting-store';
import clsx from 'clsx';

export function ParticipantCount() {
	const count = useCallSelector((call) => call.participants.joined).toArray()
		.length;
	const store = useMeetingStore();

	return (
		<button
			className={clsx(
				'border-cf-light text-cf-dark flex h-full cursor-pointer items-center gap-0.5 rounded-md border px-1.5',
				'data-active:bg-cf-dark data-active:border-transparent data-active:text-white',
			)}
			onClick={() =>
				store.setSidebar(
					store.sidebar === 'participants' ? undefined : 'participants',
				)
			}
			data-active={store.sidebar === 'participants' ? true : undefined}
		>
			<PeopleRegular className="size-4" />
			<span className="text-sm">{count + 1}</span>
		</button>
	);
}
