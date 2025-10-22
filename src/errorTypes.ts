/**
 * @file Assorted Error Types
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { ParameterType } from "./instructionSet";
import { u3, u8 } from "./num";

export type DivideByZeroError = {
	err: "divide_zero";
	register?: u3;
};

export type InstructionReadError = {
	err: "unknown_instruction";
	data: u8;
};
export type ParamReadError = {
	err: "invalid_parameter";
	expected: ParameterType;
	data: u8;
};

export type InstructionParseError = InstructionReadError | ParamReadError;

export type RuntimeError = DivideByZeroError;
