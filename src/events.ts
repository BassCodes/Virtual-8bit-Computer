export enum CpuEvent {
	MemoryChanged,
	RegisterChanged,
	MemoryByteParsed,
	ProgramCounterChanged,
	Print,
	Reset,
}

export enum MemoryCellType {
	Instruction,
	InvalidInstruction,
	Register,
	Memory,
	Constant,
}
