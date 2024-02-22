import { el, format_hex } from "../etc";
import { CpuEvent, CpuEventHandler, UiEventHandler } from "../events";
import { Instruction, ParamType, ParameterType } from "../instructionSet";
import { u8 } from "../num";
import { UiComponent } from "./uiComponent";

export class InstructionExplainer implements UiComponent {
	element: HTMLElement;
	constructor(element: HTMLElement) {
		this.element = element;
	}
	add_instruction(instr: Instruction, pos: u8, byte: u8): void {
		this.reset();
		this.add_box(format_hex(byte), instr.name, "instruction");
	}

	private add_box(box_icon_text: string, name: string, css_class: string): void {
		const instr_box = el("div", "expl_box");
		const instr_icon = el("span", "expl_icon");
		instr_icon.classList.add(css_class);
		instr_icon.setAttribute("title", css_class.toUpperCase());
		instr_icon.textContent = box_icon_text;
		const instr_box_text = el("span", "expl_text");
		instr_box_text.textContent = name;
		instr_box.appendChild(instr_icon);
		instr_box.appendChild(instr_box_text);
		this.element.appendChild(instr_box);
	}

	add_param(param: ParameterType, pos: u8, byte: u8): void {
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

	init_events(eh: UiEventHandler): void {}
	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.add_param(param, pos, code);
		});
		c.listen(CpuEvent.InstructionParsed, ({ instr, code, pos }) => {
			this.add_instruction(instr, pos, code);
		});
		c.listen(CpuEvent.InvalidParsed, ({ code, pos }) => {
			this.add_invalid(pos, code);
		});
	}

	reset(): void {
		this.element.innerHTML = "";
	}
}
