import { el } from "../../etc";
import { CpuEvent, CpuEventHandler, UiEventHandler } from "../../events";
import { WindowBox } from "../windowBox";
import { UiComponent } from "../uiComponent";

export class Printout extends WindowBox implements UiComponent {
	events: UiEventHandler;
	text_box: HTMLElement;
	constructor(element: HTMLElement, events: UiEventHandler) {
		super(element, "Printout");
		this.events = events;
		this.text_box = el("div", "printout_text");
		this.element.appendChild(this.text_box);
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.Print, (c) => {
			this.text_box.textContent += c;
		});
	}

	reset(): void {
		this.text_box.textContent = "";
	}
}
