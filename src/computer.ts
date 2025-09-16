/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { CpuEvent, CpuEventHandler, CpuSpeed, UiCpuSignal, UiCpuSignalHandler } from "./events";
import { formatHex } from "./etc";
import { Instruction, ISA, ParameterType } from "./instructionSet";
import { m256, u3, u8 } from "./num";

const CLOCK_SPEED_MAP: Record<CpuSpeed, [number, number]> = {
	slow: [1000, 1],
	normal: [200, 1],
	fast: [100, 1],
	turbo: [1, 128],
};

interface IAbstractComputer {
	readonly memory: Uint8Array;
	readonly program_counter: u8;
}

interface InstructionReadError {
	error: true;
	data: u8;
}
interface ParamReadError {
	error: true;
	data: u8;
}

interface IReadingInstruction {
	pos: u8;
	opcode: u8;
	instr: Instruction;
	valid: boolean;
	params: Array<u8 | null>;
}

function read_next_instruction(c: IAbstractComputer): IReadingInstruction | InstructionReadError {
	const byte = c.memory[c.program_counter] as u8;
	const parsed_instruction = ISA.getInstruction(byte);
	if (parsed_instruction === null) {
		return { error: true, data: byte };
	}
	const instruction: IReadingInstruction = {
		pos: c.program_counter,
		opcode: byte,
		instr: parsed_instruction,
		valid: true,
		params: [],
	};
	return instruction;
}

function read_next_instruction_param(c: IAbstractComputer, param_type: ParameterType): u8 | ParamReadError {
	const byte = c.memory[c.program_counter] as u8;
	if (!param_type.validate(byte)) {
		return { error: true, data: byte };
	}
	return byte;
}

export default class Computer {
	memory: Uint8Array = new Uint8Array(256);
	vram: Uint8Array = new Uint8Array(256);
	registers: Uint8Array = new Uint8Array(8);
	carry_flag: boolean = false;
	program_counter: u8 = 0;
	current_instr: IReadingInstruction | null = null;
	events: CpuEventHandler = new CpuEventHandler();
	on: boolean = false;
	clock_speed: number = CLOCK_SPEED_MAP.normal[0];
	instr_per_cycle: number = CLOCK_SPEED_MAP.normal[1];

	cycle(): void {
		let should_step = true;

		if (this.current_instr === null) {
			const instruction = read_next_instruction(this);
			if ("error" in instruction) {
				this.events.dispatch(CpuEvent.InvalidInstructionParsed, {
					pos: this.program_counter,
					code: instruction.data,
				});
				console.log(`Invalid instruction: ${formatHex(instruction.data)}`);
			} else {
				this.events.dispatch(CpuEvent.InstructionParseBegin, {
					pos: this.program_counter,
					instr: instruction.instr,
					code: instruction.opcode,
				});
				this.current_instr = instruction;
			}
		} else if (this.current_instr.params.length < this.current_instr.instr.params.length) {
			const param_type = this.current_instr.instr.params[this.current_instr.params.length];
			const param = read_next_instruction_param(this, param_type);

			if (typeof param === "number") {
				this.events.dispatch(CpuEvent.ParameterParsed, {
					param: param_type,
					pos: this.program_counter,
					code: param,
				});
				this.current_instr.params.push(param);
			} else {
				this.events.dispatch(CpuEvent.InvalidParameterParsed, {
					param: param_type,
					pos: this.program_counter,
					code: param.data,
				});
				this.current_instr.valid = false;
				this.current_instr.params.push(null);
			}

			if (this.current_instr.params.length === this.current_instr.instr.params.length) {
				const nostep = (): void => {
					should_step = false;
				};
				if (this.current_instr.valid) {
					const params: Array<u8> = this.current_instr.params.map((p) => p as u8);
					this.current_instr.instr.execute(this, params, nostep);
					this.events.dispatch(CpuEvent.InstructionExecuted, { instr: this.current_instr.instr });
				}

				this.events.dispatch(CpuEvent.InstructionParseEnd);
				this.current_instr = null;
			}
		}
		if (should_step) {
			this.stepForward();
		}
	}

	private getMemorySilent(address: u8): u8 {
		const value = this.memory[address] as u8;

		return value;
	}

	halt(): void {
		this.events.dispatch(CpuEvent.Halt);
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
		this.on = false;
	}
	clockStart(): void {
		if (this.on) return;
		this.on = true;
		const loop = (): void => {
			if (!this.on) return;
			for (let i = 0; i < this.instr_per_cycle; i++) {
				this.cycle();
			}
			this.events.dispatch(CpuEvent.Cycle, this.instr_per_cycle);
			setTimeout(loop, this.clock_speed);
		};
		loop();
	}
	clockStep(): void {
		this.clockStop();
		this.cycle();
	}

	initEvents(ui: UiCpuSignalHandler): void {
		ui.listen(UiCpuSignal.StepCpu, () => this.clockStep());
		ui.listen(UiCpuSignal.StartCpu, () => this.clockStart());
		ui.listen(UiCpuSignal.StopCpu, () => this.clockStop());

		ui.listen(UiCpuSignal.SetSpeed, (speed) => {
			console.log("new speed", speed);
			[this.clock_speed, this.instr_per_cycle] = CLOCK_SPEED_MAP[speed];
		});

		ui.listen(UiCpuSignal.RequestMemoryChange, ({ address, value }) => this.setMemory(address, value));
		ui.listen(UiCpuSignal.RequestVramChange, ({ address, value }) => this.setVram(address, value));
		ui.listen(UiCpuSignal.RequestRegisterChange, ({ register_no, value }) => this.setRegister(register_no, value));
		ui.listen(UiCpuSignal.RequestMemoryDump, (callback) => callback(this.dumpMemory()));
		ui.listen(UiCpuSignal.RequestVramDump, (callback) => callback(this.dumpVram()));
		ui.listen(UiCpuSignal.RequestProgramCounterChange, ({ address }) => {
			this.setProgramCounter(address);
		});
		ui.listen(UiCpuSignal.RequestCpuReset, () => this.reset());
		ui.listen(UiCpuSignal.RequestCpuSoftReset, () => this.softReset());
	}

	softReset(): void {
		this.events.dispatch(CpuEvent.SoftReset);
		for (let i = 0; i < 8; i++) this.setRegister(i as u3, 0);
		this.vram = new Uint8Array(256);
		this.setCarry(false);
		this.current_instr = null;
		this.setProgramCounter(0);
	}
	reset(): void {
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
