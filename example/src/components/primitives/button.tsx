import clsx from 'clsx';
import React from 'react';

export type ButtonProps = React.ComponentProps<'button'>;

export function Button({ className, children, ...props }: ButtonProps) {
	return (
		<button
			className={clsx(
				'inline-flex items-center gap-1.5 rounded-lg bg-orange-400/20 text-orange-700 text-sm px-3 h-9 transition-all ring-offset-2 ring-2 ring-transparent hover:ring-orange-400 outline-none hover:z-50',
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
				'inline-flex items-center rounded-lg bg-orange-400/20 text-orange-700 text-sm px-3 h-10 transition-all ring-offset-2 ring-2 ring-transparent hover:ring-orange-400 outline-none hover:z-50 *:size-6',
				'data-active:bg-orange-800 data-active:text-white',
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
