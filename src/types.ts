/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { u3, u8 } from "./num";

export interface ISerializableState {
	filename?: string;
	vram?: Uint8Array;
	memory: Uint8Array;
}

// An interface of required computer methods.
// Declared so that computer.ts needn't be imported to avoid circular dependency in instructionSet.ts
export interface GenericComputer {
	getMemory: (address: u8) => u8;
	setMemory: (address: u8, value: u8) => void;
	getVram: (address: u8) => u8;
	setVram: (address: u8, value: u8) => void;
	setProgramCounter: (address: u8) => void;
	getProgramCounter: () => u8;
	getRegister: (number: u3) => u8;
	setRegister: (number: u3, value: u8) => void;
	getCarry(): boolean;
	setCarry(state: boolean): void;
	softReset(): void;
	setColorPalette(p: u8): void;
}

export type CpuSpeed = "slow" | "normal" | "fast" | "super fast" | "turbo";
