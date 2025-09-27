/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el, formatHex } from "../../etc";
import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { Instruction, ParamType, ParameterType } from "../../instructionSet";
import { u8 } from "../../num";
import UiComponent from "../uiComponent";

const p_map = {
	[ParamType.Const]: "constant",
	[ParamType.ConstMemory]: "memory",
	[ParamType.Register]: "register",
	[ParamType.RegisterAddress]: "regaddr",
	[ParamType.NibbleRegisterPair]: "nibregpair",
};

export default class InstructionExplainer implements UiComponent {
	container: HTMLElement;
	activated: boolean = true;
	constructor(element: HTMLElement) {
		this.container = element;
		this.container.classList.add("window");

		el("div").cl("window_title").ch(el("div").id("text").tx("Instruction Explainer")).appendTo(this.container);
	}
	addInstruction(instr: Instruction, pos: u8, byte: u8): void {
		this.reset();
		this.addBox(formatHex(byte), instr.name, "instruction");
	}

	private addBox(box_icon_text: string, name: string, ...css_class: string[]): void {
		el("div")
			.id("expl_box")
			.ch(
				el("span")
					.id("expl_icon")
					.do((t) => css_class.forEach((c) => t.cl(c)))
					.at("title", css_class[0].toUpperCase())
					.tx(box_icon_text)
			)
			.ch(el("span").id("expl_text").tx(name))
			.appendTo(this.container);
	}

	addParameter(param: ParameterType, pos: u8, byte: u8): void {
		const t = param.type;

		this.addBox(formatHex(byte), param.desc, p_map[t]);
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
				if (this.activated) this.addInvalidParam(error.expected, error.data, pos);
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
		this.container.querySelectorAll("#expl_box").forEach((e) => e.remove());
	}

	softReset(): void {
		this.reset();
	}
}
