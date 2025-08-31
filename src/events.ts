/**
 * @file Specific definitions of the event handlers (CPU & UI) used within this program
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { EventHandler } from "./eventHandler";
import { Instruction, ParameterType } from "./instructionSet";
import { u2, u3, u8 } from "./num";

//
// CPU Event Handler Definition
//
export enum CpuEvent {
	MemoryChanged,
	RegisterChanged,
	ProgramCounterChanged,
	InstructionParseBegin,
	InstructionParseEnd,
	ParameterParsed,
	InvalidParameterParsed,
	InvalidInstructionParsed,
	VramChanged,
	InstructionExecuted,
	Cycle,
	Reset,
	SoftReset,
	Halt,
	MemoryAccessed,
	SetFlagCarry,
}

type VoidDataCpuEventList =
	| CpuEvent.Halt
	| CpuEvent.Reset
	| CpuEvent.SoftReset
	| CpuEvent.Cycle
	| CpuEvent.InstructionParseEnd;

interface CpuEventMap {
	[CpuEvent.MemoryChanged]: { address: u8; value: u8 };
	[CpuEvent.MemoryAccessed]: { address: u8; value: u8 };
	[CpuEvent.VramChanged]: { address: u8; value: u8 };
	[CpuEvent.RegisterChanged]: { register_no: u3; value: u8 };
	[CpuEvent.ProgramCounterChanged]: { counter: u8 };
	[CpuEvent.InstructionParseBegin]: { pos: u8; code: u8; instr: Instruction };
	[CpuEvent.ParameterParsed]: { pos: u8; code: u8; param: ParameterType };
	[CpuEvent.InvalidParameterParsed]: { pos: u8; code: u8; param: ParameterType };
	[CpuEvent.InvalidInstructionParsed]: { pos: u8; code: u8 };
	[CpuEvent.InstructionExecuted]: { instr: Instruction };
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
// Ui -> CPU Signaler definition
//

export enum UiCpuSignal {
	RequestCpuCycle,
	RequestMemoryChange,
	RequestRegisterChange,
	RequestCpuReset,
	RequestCpuSoftReset,
	RequestMemoryDump,
	RequestProgramCounterChange,
}

type VoidDataUiCpuSignalList = UiCpuSignal.RequestCpuReset | UiCpuSignal.RequestCpuSoftReset;

interface UiCpuSignalMap {
	[UiCpuSignal.RequestCpuCycle]: number;
	[UiCpuSignal.RequestMemoryChange]: { address: u8; value: u8 };
	[UiCpuSignal.RequestRegisterChange]: { register_no: u3; value: u8 };
	[UiCpuSignal.RequestProgramCounterChange]: { address: u8 };
	[UiCpuSignal.RequestMemoryDump]: (memory: Uint8Array) => void;
}

export interface UiCpuSignalHandler extends EventHandler<UiCpuSignal> {
	listen<E extends VoidDataUiCpuSignalList>(type: E, listener: () => void): void;
	dispatch<E extends VoidDataUiCpuSignalList>(type: E): void;
	listen<E extends keyof UiCpuSignalMap>(type: E, listener: (ev: UiCpuSignalMap[E]) => void): void;
	dispatch<E extends keyof UiCpuSignalMap>(type: E, data: UiCpuSignalMap[E]): void;
}

interface UICpuSignalHandlerConstructor {
	new (): UiCpuSignalHandler;
}

export const UiCpuSignalHandler = EventHandler<UiCpuSignal> as UICpuSignalHandlerConstructor;

//
// Ui Event Handler Definition
//

export enum UiEvent {
	EditOn,
	EditOff,
}

interface UiEventMap {}

type VoidDataUiEventList = UiEvent.EditOn | UiEvent.EditOff;

export interface UiEventHandler extends EventHandler<UiEvent> {
	listen<E extends keyof UiEventMap>(type: E, listener: (ev: UiEventMap[E]) => void): void;
	dispatch<E extends keyof UiEventMap>(type: E, data: UiEventMap[E]): void;
	listen<E extends VoidDataUiEventList>(type: E, listener: () => void): void;
	dispatch<E extends VoidDataUiEventList>(type: E): void;
}

interface UiEventHandlerConstructor {
	new (): UiEventHandler;
}

export const UiEventHandler = EventHandler<UiEvent> as UiEventHandlerConstructor;
