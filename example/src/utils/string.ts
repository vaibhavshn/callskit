export function isEmoji(str: string) {
	return new RegExp(
		`^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`,
		'u',
	).test(str);
}
