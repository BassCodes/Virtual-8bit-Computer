/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { ParamType } from "../../instructionSet";
import { m256, u2, u8 } from "../../num";
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

	element.appendChild(view.container);

	return view;
}

export default class MemoryView implements UiComponent {
	container: HTMLElement;
	program_counter: u8 = 0;
	last_accessed_cell: { address: u8 } | null = null;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	cells: CelledViewer;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;

		this.cells = createMemoryViewer(element, (address, value) => {
			cpu_signals.dispatch(UiCpuSignal.RequestMemoryChange, { address, value });
		});
		this.events.listen(UiEvent.EditOn, () => {
			this.cells.editor.enable();
			this.cells.clearAllClasses();
		});
		this.events.listen(UiEvent.EditOff, () => {
			this.cells.editor.disable();
			this.cells.clearAllClasses();
		});
		this.setProgramCounter(0);
	}

	setProgramCounter(position: u8): void {
		this.cells.removeCellClass(this.program_counter, "program_counter");
		this.cells.addCellClass(position, "program_counter");
		this.program_counter = position;
	}

	reset(): void {
		this.cells.reset();
		this.last_accessed_cell = null;
		this.setProgramCounter(0);
	}

	softReset(): void {
		this.cells.clearAllClasses();
		this.last_accessed_cell = null;
		this.setProgramCounter(0);
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.MemoryAccessed, ({ address, value }) => {
			if (this.last_accessed_cell?.address !== address) {
				if (this.last_accessed_cell !== null) {
					this.cells.removeCellClass(this.last_accessed_cell.address, "last_access");
				}
				this.cells.addCellClass(address, "last_access");
				this.last_accessed_cell = { address };
			}
		});
		c.listen(CpuEvent.ClockLocked, () => {
			this.cells.addCellClass(this.program_counter, "locked");
		});
		c.listen(CpuEvent.MemoryChanged, ({ address, value }) => {
			this.cells.setCellValue(address, value);
		});
		c.listen(CpuEvent.ProgramCounterChanged, ({ counter }) => {
			this.setProgramCounter(counter);
		});
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.cells.addCellClass(pos, "instruction_argument");
			const t = param.type;
			this.cells.removeCellClass(pos, "constant", "register", "memory", "instruction", "invalid", "hasright");
			const name = p_map[t];
			this.cells.addCellClass(pos, name);
			this.cells.addCellClass(pos, "active");
			this.cells.addCellClass(pos, "endcap");
			this.cells.removeCellClass(m256(pos - 1), "endcap");
			this.cells.addCellClass(m256(pos - 1), "hasright");
		});
		c.listen(CpuEvent.InstructionParseBegin, ({ instr, code, pos }) => {
			this.cells.removeCellClass(pos, "constant", "register", "memory", "invalid", "hasright");
			this.cells.removeAllCellClass("active");
			this.cells.addCellClass(pos, "instruction");
			this.cells.addCellClass(pos, "active");
			this.cells.addCellClass(pos, "endcap");
		});

		c.listen(CpuEvent.InstructionParseErrored, ({ instr, pos, error }) => {
			if (error.err === "unknown_instruction") {
				this.cells.removeCellClass(pos, "constant", "register", "memory", "instruction");
				this.cells.addCellClass(pos, "invalid");
			} else if (error.err === "invalid_parameter") {
				// todo
			}
		});
	}
}
