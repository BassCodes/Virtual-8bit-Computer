import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "./events";
import { byteArrayToJsSource, formatHex } from "./etc";
import { Instruction, ISA } from "./instructionSet";
import { m256, u2, u3, u8 } from "./num";
import { DEFAULT_VRAM_BANK } from "./constants";

export type TempInstrState = {
	pos: u8;
	params_found: number;
	instr: Instruction;
	params: Array<u8>;
};

function initBanks(): [Uint8Array, Uint8Array, Uint8Array, Uint8Array] {
	const banks = [];
	for (let i = 0; i < 4; i++) {
		banks.push(new Uint8Array(256));
	}
	return banks as [Uint8Array, Uint8Array, Uint8Array, Uint8Array];
}

export default class Computer {
	private banks: [Uint8Array, Uint8Array, Uint8Array, Uint8Array] = initBanks();
	private registers: Uint8Array = new Uint8Array(8);
	private call_stack: Array<u8> = [];
	private carry_flag: boolean = false;
	private program_counter: u8 = 0;
	private bank: u2 = 0;
	private vram_bank: u2 = DEFAULT_VRAM_BANK;
	private current_instr: TempInstrState | null = null;
	events: CpuEventHandler = new CpuEventHandler();

	cycle(): void {
		const current_byte = this.getMemorySilent(this.program_counter, 0);

		if (this.current_instr === null) {
			const parsed_instruction = ISA.getInstruction(current_byte);
			if (parsed_instruction === null) {
				this.events.dispatch(CpuEvent.InvalidParsed, {
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
				params: new Array<u8>(parsed_instruction.params.length),
			};
			this.events.dispatch(CpuEvent.InstructionParsed, {
				pos: this.program_counter,
				instr: parsed_instruction,
				code: current_byte,
			});
		}

		if (this.current_instr.pos === this.program_counter && this.current_instr.params.length > 0) {
			this.stepForward();
			this.events.dispatch(CpuEvent.Cycle);
			return;
		}

		if (this.current_instr.params.length !== this.current_instr.params_found) {
			const b = this.current_instr.instr.params[this.current_instr.params_found];

			this.events.dispatch(CpuEvent.ParameterParsed, {
				param: b,
				pos: this.program_counter,
				code: current_byte,
			});
			this.current_instr.params[this.current_instr.params_found] = current_byte;
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
		this.current_instr.instr.execute(this, this.current_instr.params, execution_post_action_state);
		this.events.dispatch(CpuEvent.InstructionExecuted, { instr: this.current_instr.instr });
		this.current_instr = null;

		if (execution_post_action_state.should_step) {
			this.stepForward();
		}
		this.events.dispatch(CpuEvent.Cycle);
	}

	private getMemorySilent(address: u8, bank_override?: u2): u8 {
		const bank = this.banks[bank_override ?? this.bank];
		const value = bank[address] as u8;

		return value;
	}

	getMemory(address: u8, bank_override?: u2): u8 {
		const value = this.getMemorySilent(address, bank_override);
		this.events.dispatch(CpuEvent.MemoryAccessed, { address, bank: this.bank, value });

		return value;
	}

	setMemory(address: u8, value: u8, bank?: u2): void {
		this.banks[bank ?? this.bank][address] = value;
		this.events.dispatch(CpuEvent.MemoryChanged, { address, bank: this.bank, value });
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

	pushCallStack(address: u8): boolean {
		if (this.call_stack.length >= 8) return false;
		this.call_stack.push(address);
		return true;
	}

	popCallStack(): u8 | null {
		return this.call_stack.pop() ?? null;
	}

	setBank(bank: u2): void {
		this.events.dispatch(CpuEvent.SwitchBank, { bank: bank });
		this.bank = bank;
	}

	setCarry(state: boolean): void {
		this.carry_flag = state;
		this.events.dispatch(CpuEvent.SetFlagCarry, true);
	}

	getCarry(): boolean {
		return this.carry_flag;
	}

	setVramBank(bank: u2): void {
		this.vram_bank = bank;
		this.events.dispatch(CpuEvent.SetVramBank, { bank });
	}

	reset(): void {
		this.events.dispatch(CpuEvent.Reset);
		this.banks = initBanks();
		this.registers = new Uint8Array(8);
		this.call_stack = [];
		this.current_instr = null;
		this.program_counter = 0;
		this.carry_flag = false;
		this.vram_bank = 3;
	}

	initEvents(ui: UiCpuSignalHandler): void {
		ui.listen(UiCpuSignal.RequestCpuCycle, (cycle_count) => {
			for (let i = 0; i < cycle_count; i++) this.cycle();
		});
		ui.listen(UiCpuSignal.RequestMemoryChange, ({ address, bank, value }) => this.setMemory(address, value, bank));
		ui.listen(UiCpuSignal.RequestRegisterChange, ({ register_no, value }) => this.setRegister(register_no, value));
		ui.listen(UiCpuSignal.RequestMemoryDump, (callback) => callback(this.dumpMemory()));
		ui.listen(UiCpuSignal.RequestCpuReset, () => this.reset());
		ui.listen(UiCpuSignal.RequestProgramCounterChange, ({ address }) => {
			this.setProgramCounter(address);
		});
	}

	loadMemory(program: Array<u8>): void {
		// TODO allow loading into other banks
		console.log(byteArrayToJsSource(program));
		const max_loop: u8 = Math.min(255, program.length) as u8;
		for (let i: u8 = 0; i < 256; i++) {
			// Don't fire event if no change is made
			if (this.banks[0][i] === program[i]) continue;

			this.banks[0][i] = program[i];
			this.events.dispatch(CpuEvent.MemoryChanged, { address: i as u8, bank: 0, value: program[i] });
		}
		this.program_counter = 0;
	}

	dumpMemory(): [Uint8Array, Uint8Array, Uint8Array, Uint8Array] {
		return this.banks;
	}

	private stepForward(): void {
		this.program_counter = m256(this.program_counter + 1);
		this.events.dispatch(CpuEvent.ProgramCounterChanged, { counter: this.program_counter });
	}
}
