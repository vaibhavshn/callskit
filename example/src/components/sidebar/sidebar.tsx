import { useCall, useCallSelector } from 'callskit/react';
import { useMeetingStore } from '../../data/meeting-store';
import clsx from 'clsx';
import { DismissFilled, DismissRegular } from '@fluentui/react-icons';
import { HTMLMotionProps, motion } from 'motion/react';
import { ChatMessage } from 'callskit';

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
			className={clsx(
				'relative rounded-lg bg-white border border-zinc-200 h-full w-full max-w-xs',
				className,
			)}
			{...props}
		>
			{store.sidebar === 'chat' && <Chat />}

			<button
				className="absolute right-2 top-2 z-10 size-6 hover:bg-zinc-100 transition-colors text-zinc-400 flex items-center justify-center rounded-md"
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
		<div className="flex flex-col size-full">
			<div className="h-14 flex items-center px-3">
				<h3 className="">Chat</h3>
			</div>

			<div className="grow px-2 flex flex-col overflow-y-auto py-2">
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
									<div className="text-xs font-semibold mb-1">
										{message.display_name}
									</div>
								)}
								<p className="bg-gradient-to-br from-zinc-100 w-fit to-zinc-50 p-2 rounded-md text-sm break-all">
									{message.message}
								</p>
							</div>
						);
					}
					return null;
				})}
			</div>

			<div className="p-2 border-t border-zinc-200">
				<div className="size-full flex flex-col bg-zinc-100 rounded-lg">
					<textarea
						name=""
						id=""
						placeholder="Message"
						className="p-2 resize-none min-h-20 outline-none text-sm"
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
