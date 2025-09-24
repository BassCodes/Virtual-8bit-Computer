/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { CpuEvent, CpuEventHandler, CpuSpeed, UiCpuSignal, UiCpuSignalHandler } from "./events";
import { Instruction, ISA, ParameterType } from "./instructionSet";
import { m256, u3, u8 } from "./num";
import { InstructionReadError, ParamReadError } from "./errorTypes";
import { GenericComputer } from "./types";

const CLOCK_SPEED_MAP: Record<CpuSpeed, [number, number]> = {
	slow: [1000, 1],
	normal: [150, 1],
	fast: [100, 1],
	"super fast": [5, 1],
	turbo: [1, 512],
};

interface IReadingInstruction {
	pos: u8;
	opcode: u8;
	instr: Instruction;
	params: Array<u8 | null>;
}

export default class Computer implements GenericComputer {
	memory: Uint8Array = new Uint8Array(256);
	vram: Uint8Array = new Uint8Array(256);
	registers: Uint8Array = new Uint8Array(8);
	carry_flag: boolean = false;
	program_counter: u8 = 0;
	current_instr: IReadingInstruction | null = null;
	events: CpuEventHandler = new CpuEventHandler();
	clock_on: boolean = false;
	clock_speed: number = CLOCK_SPEED_MAP.normal[0];
	instr_per_cycle: number = CLOCK_SPEED_MAP.normal[1];
	clock_locked: boolean = false;

	cycle(): void {
		let should_step = true;

		if (this.current_instr === null) {
			const instruction = this.read_next_instruction();
			if ("err" in instruction) {
				this.events.dispatch(CpuEvent.InstructionParseErrored, {
					pos: this.program_counter,
					error: instruction,
				});

				this.clockLock();
				return;
			}
			this.events.dispatch(CpuEvent.InstructionParseBegin, {
				pos: this.program_counter,
				instr: instruction.instr,
				code: instruction.opcode,
			});
			this.current_instr = instruction;
		} else if (this.current_instr.params.length < this.current_instr.instr.params.length) {
			const param_type = this.current_instr.instr.params[this.current_instr.params.length];
			const param = this.read_next_instruction_param(param_type);

			if (typeof param !== "number") {
				this.events.dispatch(CpuEvent.InstructionParseErrored, {
					instr: this.current_instr.instr,
					pos: this.program_counter,
					error: param,
				});
				this.clockStop();
				return;
			}

			this.events.dispatch(CpuEvent.ParameterParsed, {
				param: param_type,
				pos: this.program_counter,
				code: param,
			});
			this.current_instr.params.push(param);
		}

		if (this.current_instr !== null) {
			if (this.current_instr.params.length === this.current_instr.instr.params.length) {
				const nostep = (): void => {
					should_step = false;
				};
				const params: Array<u8> = this.current_instr.params.map((p) => p as u8);
				const error = this.current_instr.instr.execute(this, params, nostep);
				this.events.dispatch(CpuEvent.InstructionExecuted, {
					instr: this.current_instr.instr,
					code: this.current_instr.opcode,
					start_pos: this.current_instr.pos,
					end_pos: m256(this.current_instr.pos + this.current_instr.params.length),
				});
				if (error) {
					this.events.dispatch(CpuEvent.InstructionErrored, { instr: this.current_instr.instr, error: error });
					this.clockStop();
					return;
				}

				this.events.dispatch(CpuEvent.InstructionParseEnd);
				this.current_instr = null;
			}
		}
		if (should_step) {
			this.stepForward();
		}
	}

	private read_next_instruction(): IReadingInstruction | InstructionReadError {
		const byte = this.memory[this.program_counter] as u8;
		const parsed_instruction = ISA.getInstruction(byte);
		if (parsed_instruction === null) {
			return { err: "unknown_instruction", data: byte };
		}
		const instruction: IReadingInstruction = {
			pos: this.program_counter,
			opcode: byte,
			instr: parsed_instruction,
			params: [],
		};
		return instruction;
	}

	private read_next_instruction_param(param_type: ParameterType): u8 | ParamReadError {
		const byte = this.memory[this.program_counter] as u8;
		if (!param_type.validate(byte)) {
			return { err: "invalid_parameter", expected: param_type, data: byte };
		}
		return byte;
	}

	getMemory(address: u8): u8 {
		const value = this.memory[address] as u8;
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
		this.registers[register_no] = value;
		this.events.dispatch(CpuEvent.RegisterChanged, { register_no, value });
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

	clockStop(): void {
		if (this.clock_on) {
			this.events.dispatch(CpuEvent.ClockStopped);
			this.clock_on = false;
		}
	}
	clockStart(): void {
		if (this.clock_on || this.clock_locked) return;
		this.clock_on = true;
		const loop = (): void => {
			if (!this.clock_on) return;
			for (let i = 0; i < this.instr_per_cycle; i++) {
				this.cycle();
			}
			this.events.dispatch(CpuEvent.ClockCycle, this.instr_per_cycle);
			setTimeout(loop, this.clock_speed);
		};
		this.events.dispatch(CpuEvent.ClockStarted);
		loop();
	}
	clockStep(): void {
		this.clockStop();
		if (!this.clock_locked) {
			this.cycle();
		}
	}
	clockLock(): void {
		this.clock_on = false;
		if (this.clock_locked) return;
		this.events.dispatch(CpuEvent.ClockLocked);
		this.clock_locked = true;
	}

	initEvents(ui: UiCpuSignalHandler): void {
		ui.listen(UiCpuSignal.StepCpu, () => this.clockStep());
		ui.listen(UiCpuSignal.StartCpu, () => this.clockStart());
		ui.listen(UiCpuSignal.StopCpu, () => this.clockStop());

		ui.listen(UiCpuSignal.SetSpeed, (speed) => {
			[this.clock_speed, this.instr_per_cycle] = CLOCK_SPEED_MAP[speed];
		});

		ui.listen(UiCpuSignal.RequestMemoryChange, ({ address, value }) => this.setMemory(address, value));
		ui.listen(UiCpuSignal.RequestVramChange, ({ address, value }) => this.setVram(address, value));
		ui.listen(UiCpuSignal.RequestRegisterChange, ({ register_no, value }) => this.setRegister(register_no, value));
		ui.listen(UiCpuSignal.RequestMemoryDump, (callback) => callback(this.dumpMemory()));
		ui.listen(UiCpuSignal.RequestVramDump, (callback) => callback(this.dumpVram()));
		ui.listen(UiCpuSignal.RequestProgramCounterChange, (address) => this.setProgramCounter(address));
		ui.listen(UiCpuSignal.RequestCpuReset, () => this.reset());
		ui.listen(UiCpuSignal.RequestCpuSoftReset, () => this.softReset());
	}

	softReset(): void {
		this.clockStop();
		this.clock_locked = false;
		this.events.dispatch(CpuEvent.SoftReset);
		for (let i = 0; i < 8; i++) this.setRegister(i as u3, 0);
		this.vram = new Uint8Array(256);
		this.setCarry(false);
		this.current_instr = null;
		this.setProgramCounter(0);
	}
	reset(): void {
		this.clockStop();
		this.clock_locked = false;

		this.events.dispatch(CpuEvent.Reset);
		// Hard reset
		this.memory = new Uint8Array(256);
		this.vram = new Uint8Array(256);
		// Soft reset
		for (let i = 0; i < 8; i++) this.setRegister(i as u3, 0);
		this.setCarry(false);
		this.current_instr = null;
		this.setProgramCounter(0);
	}

	loadMemory(program: Array<u8>): void {
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
	dumpVram(): Uint8Array {
		return this.vram;
	}

	private stepForward(): void {
		const pc = m256(this.program_counter + 1);
		this.setProgramCounter(pc);
	}
}
