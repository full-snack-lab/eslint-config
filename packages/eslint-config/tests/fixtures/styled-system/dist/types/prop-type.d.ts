/* Minimal Panda-shaped fixture for catalog smoke tests. */
export interface UtilityValues {
	background: Tokens["colors"];
	color: Tokens["colors"];
	paddingX: Tokens["spacing"];
	paddingY: Tokens["spacing"];
	marginX: Tokens["spacing"];
	marginY: Tokens["spacing"];
	width: Tokens["sizes"];
	height: Tokens["sizes"];
	gap: Tokens["spacing"];
	fontSize: Tokens["fontSizes"];
	borderRadius: Tokens["radii"];
	zIndex: Tokens["zIndex"];
	opacity: Tokens["opacity"];
}

interface Tokens {
	colors: string;
	spacing: string;
	sizes: string;
	fontSizes: string;
	radii: string;
	zIndex: string;
	opacity: string;
}
