import { el, formatHex } from "../../etc";
import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEventHandler } from "../../events";
import { Instruction, ParamType, ParameterType } from "../../instructionSet";
import { u8 } from "../../num";
import WindowBox from "../windowBox";
import UiComponent from "../uiComponent";

const p_map = {
	[ParamType.Const]: "constant",
	[ParamType.ConstMemory]: "memory",
	[ParamType.Register]: "register",
	[ParamType.RegisterAddress]: "regaddr",
	[ParamType.NibbleRegisterPair]: "nrpair",
};

export default class InstructionExplainer extends WindowBox implements UiComponent {
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(element, "Instruction Explainer");
		this.cpu_signals = cpu_signals;
		this.events = events;
	}
	addInstruction(instr: Instruction, pos: u8, byte: u8): void {
		this.reset();
		this.addBox(formatHex(byte), instr.name, "instruction");
	}

	private addBox(box_icon_text: string, name: string, css_class: string): void {
		const instr_box = el("div").id("expl_box").fin();
		const instr_icon = el("span")
			.id("expl_icon")
			.cl(css_class)
			.at("title", css_class.toUpperCase())
			.tx(box_icon_text)
			.fin();
		const instr_box_text = el("span").id("expl_text").tx(name).fin();
		instr_box.appendChild(instr_icon);
		instr_box.appendChild(instr_box_text);
		this.container.appendChild(instr_box);
	}

	addParameter(param: ParameterType, pos: u8, byte: u8): void {
		const t = param.type;

		this.addBox(formatHex(byte), param.desc, p_map[t]);
	}

	addInvalidParam(param: ParameterType, pos: u8, byte: u8): void {
		const t = param.type;

		this.addBox(formatHex(byte), param.desc, `${p_map[t]} invalid`);
	}

	addInvalidInstr(pos: u8, byte: u8): void {
		this.reset();
		this.addBox(formatHex(byte), "Invalid Instruction", "invalid");
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.InstructionParseBegin, ({ instr, code, pos }) => {
			this.addInstruction(instr, pos, code);
		});
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.addParameter(param, pos, code);
		});
		c.listen(CpuEvent.InvalidParameterParsed, ({ param, code, pos }) => {
			this.addInvalidParam(param, code, pos);
		});
		c.listen(CpuEvent.InvalidInstructionParsed, ({ code, pos }) => {
			this.addInvalidInstr(pos, code);
		});
	}

	reset(): void {
		this.container.querySelectorAll("#expl_box").forEach((e) => e.remove());
	}

	softReset(): void {
		this.reset();
	}
}
