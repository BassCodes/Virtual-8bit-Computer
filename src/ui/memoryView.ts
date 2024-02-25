import { CpuEvent, CpuEventHandler, UiEventHandler } from "../events";
import { ParamType } from "../instructionSet";
import { u8 } from "../num.js";
import { UiComponent } from "./uiComponent";
import { CelledViewer } from "./celledViewer";

type MemoryCell = {
	el: HTMLDivElement;
};

export class MemoryView extends CelledViewer implements UiComponent {
	program_counter: u8 = 0;
	last_accessed_cell: u8 | null = null;
	events: UiEventHandler;
	constructor(element: HTMLElement, e: UiEventHandler) {
		super(16, 16, element);
		this.program_counter = 0;
		this.events = e;
	}

	set_program_counter(position: u8): void {
		this.remove_cell_class(this.program_counter, "program_counter");
		this.add_cell_class(position, "program_counter");
		this.program_counter = position;
	}

	reset(): void {
		super.reset();
		this.last_accessed_cell = null;
		this.set_program_counter(0);
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.MemoryAccessed, ({ address, bank, value }) => {
			if (bank !== 0) return;
			if (this.last_accessed_cell !== address) {
				if (this.last_accessed_cell !== null) {
					this.remove_cell_class(this.last_accessed_cell, "last_access");
				}
				this.add_cell_class(address, "last_access");
				this.last_accessed_cell = address;
			}
		});
		c.listen(CpuEvent.MemoryChanged, ({ address, bank, value }) => {
			if (bank !== 0) {
				return;
			}
			this.set_cell_value(address, value);
		});
		c.listen(CpuEvent.ProgramCounterChanged, ({ counter }) => {
			this.set_program_counter(counter);
		});
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.add_cell_class(pos, "instruction_argument");
			const t = param.type;
			this.remove_cell_class(pos, "constant", "register", "memory", "instruction", "invalid");
			let name: string = "";
			if (t === ParamType.Const) {
				name = "constant";
			} else if (t === ParamType.Memory) {
				name = "memory";
			} else if (t === ParamType.Register) {
				name = "register";
			} else {
				throw new Error("unreachable");
			}
			this.add_cell_class(pos, name);
		});
		c.listen(CpuEvent.InstructionParsed, ({ instr, code, pos }) => {
			this.remove_all_cell_class("instruction_argument");
			this.remove_all_cell_class("current_instruction");
			this.remove_cell_class(pos, "constant", "register", "memory", "invalid");
			this.add_cell_class(pos, "current_instruction");
			this.add_cell_class(pos, "instruction");
		});
		c.listen(CpuEvent.InvalidParsed, ({ code, pos }) => {
			this.remove_cell_class(pos, "constant", "register", "memory", "instruction");
			this.add_cell_class(pos, "invalid");
		});
	}
}
