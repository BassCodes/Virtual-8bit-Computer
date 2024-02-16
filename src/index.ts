import { Computer } from "./computer";
import { $ } from "./etc";
import { ISA } from "./instructionSet";
import { generate_isa } from "./isaGenerator";
import { UI } from "./ui";

function main(): void {
	// const program = [0x2f, 0x01, 0x01, 0x40, 0x00, 0x01, 0x21, 0x00, 0x02, 0x10, 0x00];
	const program = [0x2f, 0x00, 0x41, 0xfe, 0x00, 0x30, 0x00, 0x10, 0x03];

	const container = $("container");
	if (container === null) {
		throw new Error("no");
	}
	const computer = new Computer();

	const ui = new UI(container, computer.events);
	computer.load_memory(program);
	ui.set_step_func(computer.cycle.bind(computer));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(<any>window).comp = computer;

	$("ISA").textContent = generate_isa(ISA);

	// eslint-disable-next-line prefer-arrow-callback
	$("binary_upload").addEventListener("change", function (e) {
		if (e.target === null) {
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-destructuring
		const file: File = (<any>e.target).files[0];
		const reader = new FileReader();
		console.log(file);
		reader.addEventListener("load", (e) => {
			if (e.target !== null) {
				const data = e.target.result;
				if (data instanceof ArrayBuffer) {
					const view = new Uint8Array(data);
					const array = [...view];
					ui.stop_auto();
					computer.reset();
					computer.load_memory(array);
				} else {
					console.log("not array");
				}
			}
		});
		reader.readAsArrayBuffer(file);
	});
}

document.addEventListener("DOMContentLoaded", () => {
	main();
});
