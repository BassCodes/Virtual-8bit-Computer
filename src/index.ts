import { Computer } from "./computer";
import { $ } from "./etc";
import { UI } from "./ui";

function main(): void {
	// const program = [0x2f, 0x01, 0x01, 0x40, 0x00, 0x01, 0x21, 0x00, 0x02, 0x10, 0x00];
	const program = [0x2f, 0x00, 0x49, 0xfe, 0x00, 0x10, 0x03];

	const container = document.getElementById("container");
	if (container === null) {
		throw new Error("no");
	}

	const ui = new UI(container);

	const computer = new Computer(ui.state_update_event.bind(ui));

	computer.load_program(program);
	ui.set_step_func(computer.cycle.bind(computer));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(<any>window).comp = computer;

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
					computer.load_program(array);
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
