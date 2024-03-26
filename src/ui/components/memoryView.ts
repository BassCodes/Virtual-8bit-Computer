import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { ParamType } from "../../instructionSet";
import { u2, u8 } from "../../num";
import UiComponent from "../uiComponent";
import { el } from "../../etc";
import CelledViewer from "../celledViewer";

/** Only to be run once */
function createBanks(
	element: HTMLElement,
	edit_callback: (address: u8, bank: u2, value: u8) => void
): [CelledViewer, CelledViewer, CelledViewer, CelledViewer] {
	const list: Array<CelledViewer> = [];

	for (let i = 0; i < 4; i++) {
		const child = el("div").fin();
		list.push(
			new CelledViewer(16, 16, child, (address: u8, value: u8) => {
				edit_callback(address, i as u2, value);
			})
		);

		element.appendChild(child);
	}
	list[0].container.classList.add("selected");

	return list as [CelledViewer, CelledViewer, CelledViewer, CelledViewer];
}

export default class MemoryView implements UiComponent {
	container: HTMLElement;
	program_counter: u8 = 0;
	last_accessed_cell: { address: u8; bank: u2 } | null = null;
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	banks: [CelledViewer, CelledViewer, CelledViewer, CelledViewer];
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;

		this.banks = createBanks(element, (address, bank, value) => {
			cpu_signals.dispatch(UiCpuSignal.RequestMemoryChange, { address, bank, value });
		});
		for (const bank of this.banks) {
			this.events.listen(UiEvent.EditOn, () => {
				bank.editor.enable();
				bank.clearAllClasses();
			});
			this.events.listen(UiEvent.EditOff, () => {
				bank.editor.disable();
				bank.clearAllClasses();
			});
		}
		this.events.listen(UiEvent.ChangeViewBank, ({ bank }) => this.setBank(bank));
		this.setProgramCounter(0);
	}

	get program(): CelledViewer {
		return this.banks[0];
	}

	setBank(bank: u2): void {
		for (const bank of this.banks) bank.container.classList.remove("selected");
		this.banks[bank].container.classList.add("selected");
	}

	setProgramCounter(position: u8): void {
		this.program.removeCellClass(this.program_counter, "program_counter");
		this.program.addCellClass(position, "program_counter");
		this.program_counter = position;
	}

	reset(): void {
		for (const viewer of this.banks) viewer.reset();
		this.last_accessed_cell = null;
		this.setProgramCounter(0);
	}

	softReset(): void {
		for (const viewer of this.banks) viewer.clearAllClasses();
		this.last_accessed_cell = null;
		this.setProgramCounter(0);
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.MemoryAccessed, ({ address, bank, value }) => {
			if (this.last_accessed_cell?.address !== address || this.last_accessed_cell?.bank !== bank) {
				if (this.last_accessed_cell !== null) {
					this.banks[this.last_accessed_cell.bank].removeCellClass(this.last_accessed_cell.address, "last_access");
				}
				this.banks[bank].addCellClass(address, "last_access");
				this.last_accessed_cell = { address, bank };
			}
		});
		c.listen(CpuEvent.MemoryChanged, ({ address, bank, value }) => {
			if (bank !== 0) {
				return;
			}
			this.banks[bank].setCellValue(address, value);
		});
		c.listen(CpuEvent.ProgramCounterChanged, ({ counter }) => {
			this.setProgramCounter(counter);
		});
		c.listen(CpuEvent.ParameterParsed, ({ param, code, pos }) => {
			this.program.addCellClass(pos, "instruction_argument");
			const t = param.type;
			this.program.removeCellClass(pos, "constant", "register", "memory", "instruction", "invalid");
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
			this.program.addCellClass(pos, name);
		});
		c.listen(CpuEvent.InstructionParsed, ({ instr, code, pos }) => {
			this.program.removeAllCellClass("instruction_argument");
			this.program.removeAllCellClass("current_instruction");
			this.program.removeCellClass(pos, "constant", "register", "memory", "invalid");
			this.program.addCellClass(pos, "current_instruction");
			this.program.addCellClass(pos, "instruction");
		});
		c.listen(CpuEvent.InvalidParsed, ({ code, pos }) => {
			this.program.removeCellClass(pos, "constant", "register", "memory", "instruction");
			this.program.addCellClass(pos, "invalid");
		});
	}
}
