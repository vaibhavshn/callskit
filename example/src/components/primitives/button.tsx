import clsx from 'clsx';
import React from 'react';

export type ButtonProps = React.ComponentProps<'button'>;

export function Button({ className, children, ...props }: ButtonProps) {
	return (
		<button
			className={clsx(
				'inline-flex items-center gap-1.5 rounded-lg bg-orange-400/20 text-sm px-3 h-9 transition-all routline-none hover:z-50 cursor-pointer',
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
				'inline-flex items-center rounded-lg text-sm px-3 h-10 transition-all outline-none hover:z-50 *:size-6 cursor-pointer',
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
