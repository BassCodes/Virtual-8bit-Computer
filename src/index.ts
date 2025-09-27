/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import Computer from "./computer";
import UI from "./ui";
import { $ } from "./etc";
import { ISA } from "./instructionSet";
import { generateIsaTable } from "./isaGenerator";
import "./style/style.scss";
import { CpuEvent, UiCpuSignal, UiEvent } from "./events";
import { game_of_life } from "./programs";

declare global {
	interface Window {
		comp: Computer;
		ui: UI;
		firehose: () => void;
	}
}

function main(): void {
	// Computer controls program execution and sends events regarding state
	const computer = new Computer();
	const ui = new UI();

	// UI reacts to Computer events
	ui.initEvents(computer.events);
	// Load program
	computer.loadMemory(game_of_life());
	// Computer reacts to UI signals (Start execution, reset, etc.)
	computer.initEvents(ui.cpu_signaler);

	window.comp = computer;
	window.ui = ui;

	$("ISA").replaceWith(generateIsaTable(ISA));

	// to log all cpu events, run `firehose()` in console
	let fire = false;
	window.firehose = (): void => {
		if (fire === false) {
			computer.events.firehose((ident, data) => {
				console.log("CPU", `New Event: ${CpuEvent[ident]}. data: `, data);
			});
			ui.ui_events.firehose((ident, data) => {
				console.log("UI", `New Event: ${UiEvent[ident]}. data: `, data);
			});
			ui.cpu_signaler.firehose((ident, data) => {
				console.log("UI -> CPU", `New Event: ${UiCpuSignal[ident]}. data: `, data);
			});
			fire = true;
		} else {
			console.error("Firehose already started");
		}
	};

	window.firehose();
}

document.addEventListener("DOMContentLoaded", () => {
	main();
});
