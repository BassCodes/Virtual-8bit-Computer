import { el } from "../../etc";
import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEventHandler } from "../../events";
import WindowBox from "../windowBox";
import UiComponent from "../uiComponent";

export default class Printout extends WindowBox implements UiComponent {
	events: UiEventHandler;
	text_box: HTMLElement;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(element, "Printout");
		this.cpu_signals = cpu_signals;
		this.events = events;
		this.text_box = el("div").id("printout_text").fin();
		this.container.appendChild(this.text_box);
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.Print, (c) => {
			this.text_box.textContent += c;
		});
	}

	reset(): void {
		this.text_box.textContent = "";
	}
}
