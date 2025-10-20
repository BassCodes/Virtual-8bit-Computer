/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el, formatHex } from "../../etc";
import { CpuEvent, CpuEventHandler } from "../../events";
import { Instruction, VarPairParam, ParamType, ParameterType } from "../../instructionSet";
import { u8 } from "../../num";
import UiComponent from "../uiComponent";

const p_map = {
	[ParamType.Constant]: "constant",
	[ParamType.ConstMemory]: "memory",
	[ParamType.Variable]: "register",
	[ParamType.VarMem]: "regaddr",
	[ParamType.VarPair]: "nibregpair",
};

export default class InstructionExplainer implements UiComponent {
	container: HTMLElement;
	expl_container: HTMLElement;
	activated: boolean = true;
	constructor(element: HTMLElement) {
		this.container = element;
		this.container.classList.add("window");
		this.expl_container = el("div").cl("expl_container").fin();
		el("div").cl("window_title").ch(el("div").id("text").tx("Instruction Explainer")).appendTo(this.container);
		this.container.appendChild(this.expl_container);
	}

	addInstruction(instr: Instruction, pos: u8, byte: u8): void {
		this.reset();
		this.addBox(formatHex(byte), instr.name, "instruction");
	}

	private addBox(box_icon_text: string, name: string, ...css_class: string[]): void {
		el("div")
			.cl("expl_box")
			.do((s) => css_class.forEach((v) => s.cl(v)))
			.ch(el("div").cl("expl_left").ch(el("div").tx(box_icon_text)))
			.ch(el("div").cl("expl_right").ch(el("div").tx(name)))
			.appendTo(this.expl_container);
	}

	private addDualBox(
		icon_a: string,
		icon_b: string,
		purpose_a: string,
		purpose_b: string,
		class_a: string,
		class_b: string
	): void {
		el("div")
			.cl("expl_box", "multi")
			.ch(
				el("div")
					.cl("top")
					.cl(class_a)
					.ch(el("div").cl("expl_left").ch(el("div").tx(icon_a)))
					.ch(el("div").cl("expl_right").ch(el("div").tx(purpose_a)))
			)
			.ch(
				el("div")
					.cl("bottom")
					.cl(class_b)
					.ch(el("div").cl("expl_left").ch(el("div").tx(icon_b)))
					.ch(el("div").cl("expl_right").ch(el("div").tx(purpose_b)))
			)
			.appendTo(this.expl_container);
	}

	addParameter(param: ParameterType, pos: u8, byte: u8): void {
		const t = param.type;
		if (param instanceof VarPairParam) {
			const type_a = p_map[param.roleA];
			const type_b = p_map[param.roleB];
			this.addDualBox(
				((byte & 0xf) as u8).toString(16).toUpperCase(),
				((byte >> 4) as u8).toString(16).toUpperCase(),
				param.desc,
				param.descB,
				type_a,
				type_b
			);
		} else {
			this.addBox(formatHex(byte), param.desc, p_map[t]);
		}
	}

	addInvalidParam(param: ParameterType, pos: u8, byte: u8): void {
		const t = param.type;

		this.addBox(formatHex(byte), param.desc, p_map[t], "invalid");
	}

	addInvalidInstr(pos: u8, byte: u8): void {
		this.reset();
		this.addBox(formatHex(byte), "Invalid Instruction", "invalid");
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.InstructionParseBegin, ({ instr, code, pos }) => {
			if (this.activated) this.addInstruction(instr, pos, code);
		});
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			if (this.activated) this.addParameter(param, pos, code);
		});
		c.listen(CpuEvent.InstructionParseErrored, ({ instr, error, pos }) => {
			if (error.err === "invalid_parameter") {
				if (this.activated) {
					if (error.expected instanceof VarPairParam) {
						const param = error.expected;
						const byte = error.data;
						this.addDualBox(
							((byte & 0xf) as u8).toString(16).toUpperCase(),
							((byte >> 4) as u8).toString(16).toUpperCase(),
							param.desc,
							param.descB,
							"invalid",
							"invalid"
						);
					} else {
						this.addInvalidParam(error.expected, error.data, pos);
					}
				}
			} else {
				if (this.activated) this.addInvalidInstr(pos, error.data);
			}
		});
	}

	disable(): void {
		this.reset();
		this.activated = false;
	}
	enable(): void {
		this.activated = true;
	}

	reset(): void {
		this.enable();
		this.container.querySelectorAll(".expl_box").forEach((e) => e.remove());
	}

	softReset(): void {
		this.reset();
	}
}
