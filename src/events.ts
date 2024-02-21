import { u8 } from "./etc";
import { EventHandler } from "./eventHandler";
import { Instruction, ParameterType } from "./instructionSet";

export enum CpuEvent {
	MemoryChanged,
	RegisterChanged,
	ProgramCounterChanged,
	InstructionParsed,
	ParameterParsed,
	InvalidParsed,
	InstructionExecuted,
	ClockCycle,
	Print,
	Reset,
	Halt,
}

// Handily explained in https://www.cgjennings.ca/articles/typescript-events/
interface CpuEventMap {
	[CpuEvent.MemoryChanged]: { address: u8; value: u8 };
	[CpuEvent.RegisterChanged]: { register_no: u8; value: u8 };
	[CpuEvent.ProgramCounterChanged]: { counter: u8 };
	[CpuEvent.Halt]: null;
	[CpuEvent.Reset]: null;
	[CpuEvent.ClockCycle]: null;
	[CpuEvent.InstructionParsed]: { pos: u8; code: u8; instr: Instruction };
	[CpuEvent.ParameterParsed]: { pos: u8; code: u8; param: ParameterType };
	[CpuEvent.InvalidParsed]: { pos: u8; code: u8 };
	[CpuEvent.InstructionExecuted]: { instr: Instruction };
	[CpuEvent.Print]: string;
}

export interface CpuEventHandler extends EventHandler<CpuEvent> {
	listen<E extends keyof CpuEventMap>(type: E, listener: (ev: CpuEventMap[E]) => void): void;
	dispatch<E extends keyof CpuEventMap>(type: E, data: CpuEventMap[E]): void;
}

export enum UiEvent {
	RequestCpuCycle,
	RequestMemoryChange,
}

interface UiEventMap {
	[UiEvent.RequestCpuCycle]: number;
	[UiEvent.RequestMemoryChange]: { address: u8; value: u8 };
}

export interface UiEventHandler extends EventHandler<UiEvent> {
	listen<E extends keyof UiEventMap>(type: E, listener: (ev: UiEventMap[E]) => void): void;
	dispatch<E extends keyof UiEventMap>(type: E, data: UiEventMap[E]): void;
}
