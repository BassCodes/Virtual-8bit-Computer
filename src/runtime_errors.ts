import { Instruction } from "./instructionSet.js";
import { u8 } from "./num.js";

export type DivideByZeroError = {
	err: "divide_zero";
};

export type InvalidRegisterNumber = {
	err: "invalid_register";
};

export interface InstructionReadError {
	error: true;
	data: u8;
}
export interface ParamReadError {
	error: true;
	data: u8;
}

export type RuntimeError = DivideByZeroError | InvalidRegisterNumber;
