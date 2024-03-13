import { el, format_hex } from "../../etc";
import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEventHandler } from "../../events";
import { Instruction, ParamType, ParameterType } from "../../instructionSet";
import { u8 } from "../../num";
import WindowBox from "../windowBox";
import UiComponent from "../uiComponent";

export default class InstructionExplainer extends WindowBox implements UiComponent {
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(element, "Instruction Explainer");
		this.cpu_signals = cpu_signals;
		this.events = events;
	}
	add_instruction(instr: Instruction, pos: u8, byte: u8): void {
		this.reset();
		this.add_box(format_hex(byte), instr.name, "instruction");
	}

	private add_box(box_icon_text: string, name: string, css_class: string): void {
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

	add_parameter(param: ParameterType, pos: u8, byte: u8): void {
		const t = param.type;
		let name;
		if (t === ParamType.Const) {
			name = "constant";
		} else if (t === ParamType.Memory) {
			name = "memory";
		} else if (t === ParamType.Register) {
			name = "register";
		} else {
			throw new Error("unreachable");
		}
		this.add_box(format_hex(byte), param.desc, name);
	}

	add_invalid(pos: u8, byte: u8): void {
		this.reset();
		this.add_box(format_hex(byte), "Invalid Instruction", "invalid");
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.add_parameter(param, pos, code);
		});
		c.listen(CpuEvent.InstructionParsed, ({ instr, code, pos }) => {
			this.add_instruction(instr, pos, code);
		});
		c.listen(CpuEvent.InvalidParsed, ({ code, pos }) => {
			this.add_invalid(pos, code);
		});
	}

	reset(): void {
		this.container.querySelectorAll("#expl_box").forEach((e) => e.remove());
	}
}
