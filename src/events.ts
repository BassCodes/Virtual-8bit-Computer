/**
 * @file Specific definitions of the event handlers (CPU & UI) used within this program
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { EventHandler } from "./eventHandler";
import { Instruction, ParameterType } from "./instructionSet";
import { u1, u2, u3, u8 } from "./num";

//
// CPU Event Handler Definition
//
export enum CpuEvent {
	MemoryChanged,
	RegisterChanged,
	ProgramCounterChanged,
	InstructionParsed,
	ParameterParsed,
	InvalidParsed,
	InstructionExecuted,
	Cycle,
	Print,
	Reset,
	Halt,
	// ClockStarted,
	// ClockStopped,
	MemoryAccessed,
	SwitchBank,
	SetFlagCarry,
}

type VoidDataCpuEventList = CpuEvent.Halt | CpuEvent.Reset | CpuEvent.Cycle;
// | CpuEvent.ClockStarted
// | CpuEvent.ClockStopped;

interface CpuEventMap {
	[CpuEvent.MemoryChanged]: { address: u8; bank: u2; value: u8 };
	[CpuEvent.MemoryAccessed]: { address: u8; bank: u2; value: u8 };
	[CpuEvent.RegisterChanged]: { register_no: u3; value: u8 };
	[CpuEvent.ProgramCounterChanged]: { counter: u8 };
	[CpuEvent.InstructionParsed]: { pos: u8; code: u8; instr: Instruction };
	[CpuEvent.ParameterParsed]: { pos: u8; code: u8; param: ParameterType };
	[CpuEvent.InvalidParsed]: { pos: u8; code: u8 };
	[CpuEvent.InstructionExecuted]: { instr: Instruction };
	[CpuEvent.SwitchBank]: { bank: u2 };
	[CpuEvent.Print]: string;
	[CpuEvent.SetFlagCarry]: boolean;
}

export interface CpuEventHandler extends EventHandler<CpuEvent> {
	listen<E extends VoidDataCpuEventList>(type: E, listener: () => void): void;
	dispatch<E extends VoidDataCpuEventList>(type: E): void;
	listen<E extends keyof CpuEventMap>(type: E, listener: (ev: CpuEventMap[E]) => void): void;
	dispatch<E extends keyof CpuEventMap>(type: E, data: CpuEventMap[E]): void;
}

interface CpuEventHandlerConstructor {
	new (): CpuEventHandler;
}

export const CpuEventHandler = EventHandler<CpuEvent> as CpuEventHandlerConstructor;

//
// Ui Event Handler Definition
//

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

interface UiEventHandlerConstructor {
	new (): UiEventHandler;
}

export const UiEventHandler = EventHandler<UiEvent> as UiEventHandlerConstructor;
