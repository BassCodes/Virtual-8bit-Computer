import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { ParamType } from "../../instructionSet";
import { u2, u8 } from "../../num";
import UiComponent from "../uiComponent";
import { el } from "../../etc";
import CelledViewer from "../celledViewer";

const p_map = {
	[ParamType.Const]: "constant",
	[ParamType.ConstMemory]: "memory",
	[ParamType.Register]: "register",
	[ParamType.RegisterAddress]: "regaddr",
	[ParamType.NibbleRegisterPair]: "nibregpair", // todo add style
};

/** Only to be run once */
function createMemoryViewer(element: HTMLElement, edit_callback: (address: u8, value: u8) => void): CelledViewer {
	const child = el("div").fin();
	const view = new CelledViewer(16, 16, child, (address: u8, value: u8) => {
		edit_callback(address, value);
	});

	view.container.classList.add("selected");
	element.appendChild(view.container);

	return view;
}

export default class MemoryView implements UiComponent {
	container: HTMLElement;
	program_counter: u8 = 0;
	last_accessed_cell: { address: u8 } | null = null;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	memory: CelledViewer;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;

		this.memory = createMemoryViewer(element, (address, value) => {
			cpu_signals.dispatch(UiCpuSignal.RequestMemoryChange, { address, value });
		});
		this.events.listen(UiEvent.EditOn, () => {
			this.memory.editor.enable();
			this.memory.clearAllClasses();
		});
		this.events.listen(UiEvent.EditOff, () => {
			this.memory.editor.disable();
			this.memory.clearAllClasses();
		});
		this.setProgramCounter(0);
	}

	get program(): CelledViewer {
		return this.memory;
	}

	setProgramCounter(position: u8): void {
		this.program.removeCellClass(this.program_counter, "program_counter");
		this.program.addCellClass(position, "program_counter");
		this.program_counter = position;
	}

	reset(): void {
		this.memory.reset();
		this.last_accessed_cell = null;
		this.setProgramCounter(0);
	}

	softReset(): void {
		this.memory.clearAllClasses();
		this.last_accessed_cell = null;
		this.setProgramCounter(0);
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.MemoryAccessed, ({ address, value }) => {
			if (this.last_accessed_cell?.address !== address) {
				if (this.last_accessed_cell !== null) {
					this.memory.removeCellClass(this.last_accessed_cell.address, "last_access");
				}
				this.memory.addCellClass(address, "last_access");
				this.last_accessed_cell = { address };
			}
		});
		c.listen(CpuEvent.MemoryChanged, ({ address, value }) => {
			this.memory.setCellValue(address, value);
		});
		c.listen(CpuEvent.ProgramCounterChanged, ({ counter }) => {
			this.setProgramCounter(counter);
		});
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.program.addCellClass(pos, "instruction_argument");
			const t = param.type;
			this.program.removeCellClass(pos, "constant", "register", "memory", "instruction", "invalid");
			const name = p_map[t];
			this.program.addCellClass(pos, name);
		});
		c.listen(CpuEvent.InstructionParseBegin, ({ instr, code, pos }) => {
			this.program.removeAllCellClass("instruction_argument");
			this.program.removeAllCellClass("current_instruction");
			this.program.removeCellClass(pos, "constant", "register", "memory", "invalid");
			this.program.addCellClass(pos, "current_instruction");
			this.program.addCellClass(pos, "instruction");
		});
		c.listen(CpuEvent.InvalidInstructionParsed, ({ code, pos }) => {
			this.program.removeCellClass(pos, "constant", "register", "memory", "instruction");
			this.program.addCellClass(pos, "invalid");
		});
	}
}
