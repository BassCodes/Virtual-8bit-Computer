const B64_ALPHABET: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const B64_REVERSE_ALPHABET: Record<string, number> = {};

for (let i = 0; i < B64_ALPHABET.length; i++) {
	B64_REVERSE_ALPHABET[B64_ALPHABET[i]] = i;
}

function bytes_to_sextets(
	a: number,
	b: number | undefined,
	c: number | undefined
): [number, number | undefined, number | undefined, number | undefined] {
	const sa = a >> 2;
	let sb;
	let sc;
	let sd;
	if (b === undefined) {
		sb = (a & 0b11) << 4;
	} else if (c === undefined) {
		sb = ((a & 0b11) << 4) | ((b as number) >> 4);
		sc = (b & 0b1111) << 2;
	} else {
		sb = ((a & 0b11) << 4) | (b >> 4);
		sc = ((b & 0b1111) << 2) | (c >> 6);
		sd = c & 0b111111;
	}
	return [sa, sb, sc, sd];
}

function sextets_to_bytes(
	a: number,
	b: number,
	c: number | undefined,
	d: number | undefined
): [number, number | undefined, number | undefined] {
	let ba;
	let bb;
	let bc;

	if (b === undefined) {
		ba = a << 2;
	} else if (c === undefined) {
		ba = (a << 2) | (b >> 4);
	} else if (d === undefined) {
		ba = (a << 2) | (b >> 4);
		bb = ((b & 0b1111) << 4) | (c >> 2);
	} else {
		ba = (a << 2) | (b >> 4);
		bb = ((b & 0b1111) << 4) | (c >> 2);
		bc = ((c & 0b11) << 6) | d;
	}

	return [ba, bb, bc];
}

export function b64_encode(array: number[]): string {
	// Supposedly this functionally is becoming a web standard soon.

	let out = "";
	for (let i = 0; i < array.length; i += 3) {
		for (const sextet of bytes_to_sextets(array[i], array[i + 1], array[i + 2])) {
			out += sextet !== undefined ? B64_ALPHABET[sextet] : "=";
		}
	}

	return out;
}

export function b64_decode(s: string): number[] {
	const sx = [...s].map((c) => B64_REVERSE_ALPHABET[c]);
	const tmp: number[] = [];
	for (let i = 0; i < sx.length; i += 4) {
		for (const byte of sextets_to_bytes(sx[i], sx[i + 1], sx[i + 2], sx[i + 3])) {
			if (byte !== undefined) {
				tmp.push(byte);
			} else {
				break;
			}
		}
	}
	return tmp;
}
