# ISA V0.7

# Terms

The form of this document is a list of instructions set into categories.
Each instruction starts with the recommended mnemonic and then the parameters for the instruction.

```
<Code> <mnemonic> <parameter 1> <parameter 2> ...
```

Each parameter is is abbreviated into a category

- R: Register
- M: Memory address
- C: Constant

Parts of this document marked with **!!** are uncertain and will likely change

# Instructions

## Memory & Register Management

**COPY** _from_, _to_ - Copies the byte in _from_ to the destination _to_\
0x10 COPY R M\
0x11 COPY M R\
0x12 COPY M M\
0x13 COPY R R

**ZERO** _to_ - Sets the value in _to_ to 0\
0x17 ZERO R\
0x18 ZERO M

0x19 **SET** R C - Sets the value in R to C

0x1F **SETB** R - Sets the current memory bank to the value in R

## Control Flow

0x00 **NOP** - Does nothing

**GOTO** _address_ - Moves instruction counter to _address_\
0x20 GOTO R\
0x21 GOTO C

**GOTRUE** R, _address_ - Moves instruction counter to _address_ if R is true\
0x22 GOTOTRUE R R\
0x23 GOTOTRUE R C

0x2A **GOCRY** _address_ - Moves the instruction counter to _address_ if the cary flag is set

0x2D **CALL** R - Moves the instruction counter to R and pushes the address of the call instruction

0x2E **RET** - Pops the address of the last call instruction off of the call stack and moves the instruction counter past it.

0x2F **HCF** - Halt and catch fire.

## Comparison

**EQU** _result_, _p1_, _p2_ - Sets _result_ to true if the values in _p1_ and _p2_ are the same\
0x30 EQU R R R\
0x31 EQU R R C

**LT** _result_, _p1_, _p2_ - Sets _result_ to true if the value in _p1_ is less than the value in _p2_\
0x32 LT R R R \
0x33 LT R R C

**GT** _result_, _p1_, _p2_ - Sets _result_ to true if the value in _p1_ is greater than the value in _p2_\
0x34 GT R R R \
0x35 GT R R C

Reserved for LEQ GEQ

0x36\
0x37\
0x38\
0x39

## Logic / Bitwise

**OR** R, _value_ - Sets each bit in R to its OR with the respective bit in _value_\
0x40 OR R R\
0x41 OR R C

**AND** R, _value_ - Sets each bit in R to its AND with the respective bit in _value_\
0x42 AND R R\
0x43 AND R C

**XOR** R, _value_ - Sets each bit in R to its XOR with the respective bit in _value_\
0x44 XOR R R\
0x45 XOR R C

**LBS** R, _quantity_ - Shifts each bit in R to the left by _quantity_. Fills new bits with 0\
0x46 LBS R R\
0x47 LBS R C

**RBS** R, _quantity_ - Shifts each bit in R to the right by _quantity_. Fills new bits with 0\
0x48 RBS R R\
0x49 RBS R C

0x4A **NOT** R - Flips each bit in value R

## Arithmetic

**ADD** _to_, _from_ - Adds to the the byte in _to_ with the value in _from_\
0x50 ADD R R\
0x51 ADD R C

**SUB** _to_, _from_ - Subtracts from the value in _to_ by the value in _from_\
0x52 SUB R R\
0x53 SUB R C

0x5E **INC** R - Increments the value in R by 1

0x5F **DEC** R - Decrements the value in R by 1

## IO

!! **INTXT** R - Read 1 byte of input to R

0xF0 **OUTXT** R - Prints the value in R to output as ASCII

0xF1 **OUT** R - Prints the value in R to output as base 10

0xFF **VRB** R - Selects the bank number in R to be used as VRAM

# What is True?

True is defined as having the least significant bit in a byte set to 1. False is defined as having the least significant bit in a byte set to 0.

# What are flags

The CPU has the following flags

- Carry

Flags are set as the result of instructions.

## Carry

When the add instruction runs, the result can be greater than 8 bits in size. In this case, the carry flag is set true.

!! The cary flag is set to false in two cases: At the start of an **ADD** instruction, and after running a **GOCRY** instruction
