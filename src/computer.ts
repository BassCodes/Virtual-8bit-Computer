import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "./events";
import { byteArrayToJsSource, formatHex } from "./etc";
import { Instruction, ISA } from "./instructionSet";
import { m256, u2, u3, u8 } from "./num";

interface ParsedParameter {
	pos: u8;
	code: u8;
	valid: boolean;
}

export type TempInstrState = {
	pos: u8;
	params_found: number;
	instr: Instruction;
	valid: boolean;
	params: Array<ParsedParameter>;
};

function initMemory(): Uint8Array {
	return new Uint8Array(256);
}

export default class Computer {
	private memory: Uint8Array = initMemory();
	private vram: Uint8Array = initMemory();
	private registers: Uint8Array = new Uint8Array(8);
	private carry_flag: boolean = false;
	private program_counter: u8 = 0;
	private current_instr: TempInstrState | null = null;
	events: CpuEventHandler = new CpuEventHandler();

	cycle(): void {
		const current_byte = this.getMemorySilent(this.program_counter);

		if (this.current_instr === null) {
			const parsed_instruction = ISA.getInstruction(current_byte);
			if (parsed_instruction === null) {
				this.events.dispatch(CpuEvent.InvalidInstructionParsed, {
					pos: this.program_counter,
					code: current_byte,
				});
				console.log(`Invalid instruction: ${formatHex(current_byte)}`);
				this.stepForward();
				this.events.dispatch(CpuEvent.Cycle);
				return;
			}

			this.current_instr = {
				pos: this.program_counter,
				instr: parsed_instruction,
				params_found: 0,
				valid: true,
				params: new Array<ParsedParameter>(parsed_instruction.params.length),
			};

			this.events.dispatch(CpuEvent.InstructionParseBegin, {
				pos: this.program_counter,
				instr: parsed_instruction,
				code: current_byte,
			});
			this.stepForward();
			this.events.dispatch(CpuEvent.Cycle);
			return;
		}

		// if (this.current_instr.pos === this.program_counter && this.current_instr.params.length > 0) {
		// 	this.stepForward();
		// 	this.events.dispatch(CpuEvent.Cycle);
		// 	return;
		// }

		if (this.current_instr.params.length !== this.current_instr.params_found) {
			const b = this.current_instr.instr.params[this.current_instr.params_found];

			const valid = b.validate(current_byte);
			if (valid) {
				this.events.dispatch(CpuEvent.ParameterParsed, {
					param: b,
					pos: this.program_counter,
					code: current_byte,
				});
			} else {
				this.events.dispatch(CpuEvent.InvalidParameterParsed, {
					param: b,
					pos: this.program_counter,
					code: current_byte,
				});
				this.current_instr.valid = false;
			}

			const param = { pos: this.program_counter, code: current_byte, valid };

			this.current_instr.params[this.current_instr.params_found] = param;
			this.current_instr.params_found += 1;

			if (this.current_instr.params.length !== this.current_instr.params_found) {
				this.stepForward();
				this.events.dispatch(CpuEvent.Cycle);
				return;
			}
		}
		const execution_post_action_state = {
			should_step: true,
			noStep: function (): void {
				this.should_step = false;
			},
			dispatch: this.events.dispatch.bind(this.events),
		};
		if (this.current_instr.valid) {
			const params: Array<u8> = this.current_instr.params.map((p) => p.code);
			this.current_instr.instr.execute(this, params, execution_post_action_state);
			this.events.dispatch(CpuEvent.InstructionExecuted, { instr: this.current_instr.instr });
		}
		this.events.dispatch(CpuEvent.InstructionParseEnd);
		this.current_instr = null;

		if (execution_post_action_state.should_step) {
			this.stepForward();
		}
		this.events.dispatch(CpuEvent.Cycle);
	}

	private getMemorySilent(address: u8): u8 {
		const value = this.memory[address] as u8;

		return value;
	}

	getMemory(address: u8): u8 {
		const value = this.getMemorySilent(address);
		this.events.dispatch(CpuEvent.MemoryAccessed, { address, value });

		return value;
	}

	setMemory(address: u8, value: u8): void {
		this.memory[address] = value;
		this.events.dispatch(CpuEvent.MemoryChanged, { address, value });
	}
	getVram(address: u8): u8 {
		const value = this.vram[address] as u8;
		return value;
	}

	setVram(address: u8, value: u8): void {
		this.vram[address] = value;
		this.events.dispatch(CpuEvent.VramChanged, { address, value });
	}

	getRegister(register_no: u3): u8 {
		return this.registers[register_no] as u8;
	}

	setRegister(register_no: u3, value: u8): void {
		this.events.dispatch(CpuEvent.RegisterChanged, { register_no, value });
		this.registers[register_no] = value;
	}

	getProgramCounter(): u8 {
		return this.program_counter;
	}

	setProgramCounter(new_value: u8): void {
		this.events.dispatch(CpuEvent.ProgramCounterChanged, { counter: new_value });
		this.program_counter = new_value;
	}

	setCarry(state: boolean): void {
		this.carry_flag = state;
		this.events.dispatch(CpuEvent.SetFlagCarry, true);
	}

	getCarry(): boolean {
		return this.carry_flag;
	}

	initEvents(ui: UiCpuSignalHandler): void {
		ui.listen(UiCpuSignal.RequestCpuCycle, (cycle_count) => {
			for (let i = 0; i < cycle_count; i++) this.cycle();
		});
		ui.listen(UiCpuSignal.RequestMemoryChange, ({ address, value }) => this.setMemory(address, value));
		ui.listen(UiCpuSignal.RequestRegisterChange, ({ register_no, value }) => this.setRegister(register_no, value));
		ui.listen(UiCpuSignal.RequestMemoryDump, (callback) => callback(this.dumpMemory()));
		ui.listen(UiCpuSignal.RequestProgramCounterChange, ({ address }) => {
			this.setProgramCounter(address);
		});
		ui.listen(UiCpuSignal.RequestCpuReset, () => this.reset());
		ui.listen(UiCpuSignal.RequestCpuSoftReset, () => this.softReset());
	}

	softReset(): void {
		this.events.dispatch(CpuEvent.SoftReset);
		for (let i = 0; i < 8; i++) this.setRegister(i as u3, 0);
		// while (this.popCallStack() !== null) 0;
		this.setCarry(false);
		this.current_instr = null;
		this.setProgramCounter(0);
	}
	reset(): void {
		this.events.dispatch(CpuEvent.Reset);
		// Hard reset
		this.memory = initMemory();
		// Soft reset
		for (let i = 0; i < 8; i++) this.setRegister(i as u3, 0);
		// while (this.popCallStack() !== null) 0;
		this.setCarry(false);
		this.current_instr = null;
		this.setProgramCounter(0);
	}

	loadMemory(program: Array<u8>): void {
		console.log(byteArrayToJsSource(program));
		const max_loop: u8 = Math.min(255, program.length) as u8;
		for (let i: u8 = 0; i < 256; i++) {
			// Don't fire event if no change is made
			if (this.memory[i] === program[i]) continue;

			this.memory[i] = program[i];
			this.events.dispatch(CpuEvent.MemoryChanged, { address: i as u8, value: program[i] });
		}
		this.program_counter = 0;
	}

	dumpMemory(): Uint8Array {
		return this.memory;
	}

	private stepForward(): void {
		this.program_counter = m256(this.program_counter + 1);
		this.events.dispatch(CpuEvent.ProgramCounterChanged, { counter: this.program_counter });
	}
}
