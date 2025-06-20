import { useCall, useCallSelector } from 'callskit/react';
import { useMeetingStore } from '../../data/meeting-store';
import clsx from 'clsx';
import {
	DismissFilled,
	MicOffRegular,
	MicRegular,
	VideoOffRegular,
	VideoRegular,
} from '@fluentui/react-icons';
import { HTMLMotionProps, motion } from 'motion/react';
import { CallParticipant, CallSelf, ChatMessage } from 'callskit';

type SidebarProps = HTMLMotionProps<'div'>;

export function Sidebar({ className, ...props }: SidebarProps) {
	const store = useMeetingStore();

	if (!store.sidebar) {
		return null;
	}

	return (
		<motion.div
			initial={{ x: 120 }}
			animate={{ x: 0 }}
			exit={{ x: 120 }}
			transition={{ duration: 0.2 }}
			className={clsx(
				'relative h-full w-full mr-3 max-w-xs rounded-lg border border-zinc-200 bg-white dark:bg-gray-950',
				className,
			)}
			{...props}
		>
			{store.sidebar === 'chat' && <Chat />}
			{store.sidebar === 'participants' && <ParticipantsSidebar />}

			<button
				className="absolute top-2 right-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100"
				onClick={() => {
					store.setSidebar(undefined);
				}}
			>
				<DismissFilled className="size-4" />
			</button>
		</motion.div>
	);
}

function getSecondsSince(from: Date, to: Date) {
	return Math.floor((to.getTime() - from.getTime()) / 1000);
}

function Chat() {
	const call = useCall();
	const messages = useCallSelector((call) => call.chat.messages);

	let lastMessage: ChatMessage | undefined = undefined;

	return (
		<div className="flex size-full flex-col">
			<div className="flex h-12 shrink-0 items-center px-3">
				<h3 className="">Chat</h3>
			</div>

			<div className="flex grow flex-col overflow-y-auto px-3 py-2">
				{messages.map((message) => {
					const isContinued = lastMessage
						? lastMessage.user_id === message.user_id &&
							getSecondsSince(lastMessage.created_at, message.created_at) < 30
						: false;

					if (message.type === 'text') {
						lastMessage = message;

						return (
							<div
								key={message.id}
								className={clsx('mb-2', isContinued && '-mt-1')}
							>
								{!isContinued && (
									<div className="mb-1 text-xs font-semibold">
										{message.display_name}
									</div>
								)}
								<p className="w-fit rounded-md bg-gradient-to-br from-zinc-100 to-zinc-50 p-2 text-sm break-all dark:from-gray-800 dark:to-gray-900">
									{message.message}
								</p>
							</div>
						);
					}
					return null;
				})}
			</div>

			<div className="border-t border-zinc-200 p-2">
				<div className="flex size-full flex-col rounded-lg bg-transparent">
					<textarea
						name=""
						id=""
						placeholder="Message everyone..."
						className="min-h-20 resize-none border-none bg-transparent p-2 text-sm ring-0 outline-none"
						onKeyDown={(e) => {
							if (
								!e.shiftKey &&
								e.key === 'Enter' &&
								e.currentTarget.value.trim() !== ''
							) {
								e.preventDefault();
								call.chat.sendTextMessage(e.currentTarget.value);
								e.currentTarget.value = '';
							}
						}}
					/>
					{/* <div className="flex items-center justify-between">
						<div></div>
						<div className="flex items-center">
							<button className="text-xs font-semibold text-zinc-500 hover:text-zinc-700">
								<SendRegular className="size-3" />
							</button>
						</div>
					</div> */}
				</div>
			</div>
		</div>
	);
}

function Participant({
	participant,
	isSelf = false,
}: {
	participant: CallParticipant | CallSelf;
	isSelf?: boolean;
}) {
	return (
		<div className="flex items-center justify-between px-4 py-2">
			<div className="flex items-center gap-1 text-xs">
				<span className="text-sm">{participant.name}</span>
				{isSelf && <span className="text-zinc-500">(you)</span>}
			</div>
			<div className="flex items-center gap-2">
				<div
					className={clsx(
						'*:size-5',
						!participant.micEnabled && 'text-red-700',
					)}
				>
					{participant.micEnabled ? <MicRegular /> : <MicOffRegular />}
				</div>
				<div
					className={clsx(
						'*:size-5',
						!participant.cameraEnabled && 'text-red-700',
					)}
				>
					{participant.cameraEnabled ? <VideoRegular /> : <VideoOffRegular />}
				</div>
			</div>
		</div>
	);
}

export function ParticipantsSidebar() {
	const participants = useCallSelector(
		(call) => call.participants.joined,
	).toArray();
	const self = useCallSelector((call) => call.self);

	return (
		<div className="flex size-full flex-col">
			<div className="flex h-12 shrink-0 items-center px-4">
				<h3 className="">Participants</h3>
			</div>

			<div className="flex grow flex-col overflow-y-auto pb-2">
				<Participant participant={self} isSelf />
				{participants.map((participant) => (
					<Participant key={participant.id} participant={participant} />
				))}
			</div>
		</div>
	);
}
