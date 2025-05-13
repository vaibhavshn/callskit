import clsx from 'clsx';
import React from 'react';

export type ButtonProps = React.ComponentProps<'button'>;

export function Button({ className, children, ...props }: ButtonProps) {
	return (
		<button
			className={clsx(
				'routline-none inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-orange-400/20 px-3 text-sm transition-all hover:z-50',
				'[&_svg]:size-5',
				'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-950',
				'dark:from-orange-400/60 dark:to-orange-500/40 dark:text-white',
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}

export function ControlbarButton({
	className,
	children,
	...props
}: ButtonProps) {
	return (
		<button
			className={clsx(
				'inline-flex h-10 cursor-pointer items-center rounded-lg px-3 text-sm transition-all outline-none *:size-6 hover:z-50',
				'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-950',
				'dark:from-orange-400/70 dark:to-orange-600/60 dark:text-white',
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
