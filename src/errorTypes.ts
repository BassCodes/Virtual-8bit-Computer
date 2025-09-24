import { Instruction, ParameterType } from "./instructionSet";
import { u3, u8 } from "./num";

export type DivideByZeroError = {
	err: "divide_zero";
	register?: u3;
};

export type InvalidRegisterNumber = {
	err: "invalid_register";
	no: u8;
};

export interface InstructionReadError {
	err: "unknown_instruction";
	data: u8;
}
export interface ParamReadError {
	err: "invalid_parameter";
	expected: ParameterType;
	data: u8;
}

export type InstructionParseError = InstructionReadError | ParamReadError;

export type RuntimeError = DivideByZeroError | InvalidRegisterNumber;
