/* eslint-disable */

// yeah I know it's crap.
// ... but it works :)
// this was brain-vibe-coded at 3am with only 2 brain cells active in the ol'
// brain cell mine.

// Probably doesn't work right with all instructions.
// Probably contains instructions which no longer exist.
const fs = require("fs");
const { stdout } = require("process");

const hex = (n) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");
const merge = (a, b) => (a << 4) + b;

class ParamList {
	constructor() {
		this.list = [];
		this.i = 0;
	}
	addParam(type, value) {
		this.list.push([type, value]);
	}
	nextParam() {
		const p = this.list?.[this.i];
		this.i += 1;
		if (p === undefined) throw new Error("All params used");
		return p;
	}
	getExpect(expected) {
		const [type, value] = this.nextParam();
		if (type != expected) throw new Error("Expected " + expected);
		return value;
	}
	getLabel() {
		return this.getExpect(":");
	}
	getRegis() {
		return this.getExpect("R");
	}
	getRegisMem() {
		return this.getExpect("RM");
	}
	getNum() {
		return this.getExpect("NUM");
	}
	getMem() {
		return this.getExpect("M");
	}
	nextIs(type) {
		if (this.list.len < this.i) {
			return false;
		}
		return this.list[this.i][0] === type;
	}
	finished() {
		if (this.i < this.list.length) {
			throw new Error("extra parameters");
		}
	}
}

const ISA = new Map();

function addInstruction(name, translator) {
	ISA.set(name.toUpperCase(), translator);
}

addInstruction("MOV", (p) => {
	const allowed_source = ["R", "RM", "M", "NUM"];
	const allowed_dest = ["R", "RM", "M"];
	const [src_type, src] = p.nextParam();
	const [dest_type, dest] = p.nextParam();
	if (!allowed_source.includes(src_type)) throw new Error("invalid source param");
	if (!allowed_dest.includes(dest_type)) throw new Error("invalid destination param");

	const mode = src_type + "|" + dest_type;
	const modeMap = {
		"R|M": (src, dest) => [hex(0x10), hex(src), hex(dest)],
		"M|R": (src, dest) => [hex(0x11), hex(src), hex(dest)],
		"M|M": (src, dest) => [hex(0x12), hex(src), hex(dest)],
		"R|R": (src, dest) => [hex(0x13), hex(merge(src, dest))],
		"RM|R": (src, dest) => [hex(0x14), hex(merge(src, dest))],
		"R|RM": (src, dest) => [hex(0x15), hex(merge(src, dest))],
		"NUM|R": (src, dest) => (src === 0 ? [hex(0x17), hex(dest)] : [hex(0x19), hex(dest), hex(src)]),
	};
	// console.log(src_type, dest_type, src, dest);
	return modeMap[mode](src, dest);
});

addInstruction("goto", (p) => {
	if (p.nextIs(":")) {
		const label = p.getLabel();
		return [hex(0x21), { label }];
	} else if (p.nextIs("RM")) {
		const m = p.getRegisMem();
		return [hex(0x20), hex(m)];
	} else {
		throw new Error("");
	}
});

addInstruction("gotoif", (p) => {
	const r = p.getRegis();
	const label = p.getLabel();
	return [hex(0x23), hex(r), { label }];
});

addInstruction("gotosave", (p) => {
	const r = p.getRegis();
	const label = p.getLabel();
	return [hex(0x25), hex(r), { label }];
});
addInstruction("nop", (p) => {
	return [hex(0x00)];
});

addInstruction("EQ", (p) => {
	const dest = p.getRegis();
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x30), hex(dest), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x31), hex(dest), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("LT", (p) => {
	const dest = p.getRegis();
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x32), hex(dest), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x33), hex(dest), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("GT", (p) => {
	const dest = p.getRegis();
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x34), hex(dest), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x35), hex(dest), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("or", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x40), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x41), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("and", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x42), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x43), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});

addInstruction("xor", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x44), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x45), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});

addInstruction("shl", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x46), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x47), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("shr", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x48), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x49), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("not", (p) => {
	const lhs = p.getRegis();
	return [hex(0x4a), hex(lhs)];
});

addInstruction("add", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x50), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x51), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("sub", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x52), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x53), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});
addInstruction("inc", (p) => {
	const lhs = p.getRegis();
	return [hex(0x5e), hex(lhs)];
});
addInstruction("dec", (p) => {
	const lhs = p.getRegis();
	return [hex(0x5f), hex(lhs)];
});

addInstruction("mul", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x54), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x55), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});

addInstruction("div", (p) => {
	const lhs = p.getRegis();
	if (p.nextIs("R")) {
		const rhs = p.getRegis();
		return [hex(0x56), hex(merge(lhs, rhs))];
	} else if (p.nextIs("NUM")) {
		const rhs = p.getNum();
		return [hex(0x57), hex(lhs), hex(rhs)];
	} else {
		throw new Error("");
	}
});

addInstruction("RNG", (p) => {
	const lhs = p.getRegis();
	return [hex(0xf0), hex(lhs)];
});
addInstruction("halt", (p) => {
	return [hex(0x2f)];
});

addInstruction("SET_VRAM", (p) => {
	const dest = p.getRegisMem();
	if (p.nextIs("R")) {
		const val = p.getRegis();
		return [hex(0xfe), hex(merge(dest, val))];
	} else if (p.nextIs("NUM")) {
		const val = p.getNum();
		return [hex(0xff), hex(dest), hex(val)];
	} else {
		throw new Error("");
	}
});

addInstruction("GET_VRAM", (p) => {
	const src = p.getRegisMem();
	const dest = p.getRegis();
	return [hex(0xfd), hex(merge(src, dest))];
});
addInstruction("PAL", (p) => {
	const src = p.getNum();

	return [hex(0xfa), hex(src)];
});

let asm = fs.readFileSync(0, "utf-8").toString();

asm = asm.split("\n");
console.log("starting.............");

// Remove leading/trailing line whitespace
asm = asm.map((l) => l.trim());
// Remove comments
asm = asm.filter((l) => l?.[0] !== "#");
// Remove empty lines
asm = asm.filter((l) => l !== "");

let parsed = [...asm.entries()].map(([i, l]) => process_line(l, i));

console.log(parsed);

parsed = parsed.map((p) => (p.type === "instruction" ? translate_instruction(p) : p));

function translate_instruction(p) {
	const a = ISA.get(p.name.toUpperCase())(p.params);
	p.params.finished();
	return a;
}

const label_byte_lookup = new Map();

function final_codegen(parsed) {
	const instructions = [];
	{
		let byte_idx = 0;
		// scan for labels
		for (const p of parsed) {
			if (p?.type === "label") {
				label_byte_lookup.set(p.name, byte_idx);
			} else {
				instructions.push(p);
				byte_idx += p.length;
			}
		}
	}
	const code = [];
	for (const instr of instructions) {
		for (const part of instr) {
			if (typeof part === "object") {
				const label = part.label;
				const pos = label_byte_lookup.get(label);
				if (pos === undefined) {
					throw Error(`label not found ${label}`);
				}
				code.push(hex(pos));
			} else {
				code.push(part);
			}
		}
	}
	return code;
}
const code = final_codegen(parsed);
stdout.write("[");
for (const byte of code) {
	stdout.write(`${byte}, `);
}
stdout.write("]");

function parse_param(param) {
	if (param.startsWith("RM")) {
		const sp = param.split("RM")[1];
		const [subtype, val] = parse_param(sp);
		if (subtype !== "NUM") throw new Error("Non number type encountered" + subtype + val);
		if (val > 8) throw new Error("Too high register number encountered " + val);
		return ["RM", val];
	} else if (param.startsWith("R")) {
		const sp = param.split("R")[1];
		const [subtype, val] = parse_param(sp);
		if (subtype !== "NUM") throw new Error("Non number type encountered" + subtype + val);
		if (val > 8) throw new Error("Too high register number encountered " + val);
		return ["R", val];
	} else if (param.startsWith("M")) {
		const sp = param.split("M")[1];
		const [subtype, val] = parse_param(sp);
		if (subtype !== "NUM") throw new Error("Non number type encountered" + subtype + val);
		return ["M", val];
	} else if (param.startsWith(":")) {
		const label_name = param.split(":")[1];
		return [":", label_name];
	} else if (param.startsWith("0x")) {
		const hex = param.split("0x")[1];
		const num = parseInt(hex, 16);
		if (isNaN(num) || num >= 256 || num < 0) {
			throw new Error("Could not parse literal number: " + dec + param);
		}
		return ["NUM", num];
	} else {
		const dec = param;
		const num = parseInt(dec, 10);
		if (isNaN(num) || num >= 256 || num < 0) {
			throw new Error("Could not parse literal number: " + dec + param);
		}
		return ["NUM", num];
	}
}

function process_line(line, line_no) {
	if (line.startsWith("L ")) {
		const label_name = line.split("L ")[1];
		return {
			type: "label",
			name: label_name,
			line_no,
		};
	} else {
		const sp = line.split(" ");
		const instr_name = sp[0];
		sp.shift();
		const param_list = new ParamList();

		for (const param of sp) {
			const [param_type, param_val] = parse_param(param);
			param_list.addParam(param_type, param_val);
		}
		return { type: "instruction", name: instr_name, params: param_list, line_no };
	}
}
