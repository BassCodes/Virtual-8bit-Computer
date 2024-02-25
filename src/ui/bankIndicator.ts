import { UiEventHandler, CpuEventHandler, CpuEvent } from "../events";
import { u1, u2 } from "../num";
import { UiComponent } from "./uiComponent";

class BankIndicator implements UiComponent {
	element: HTMLElement;
	events: UiEventHandler;
	constructor(element: HTMLElement, events: UiEventHandler) {
		this.element = element;
		this.events = events;
	}

	reset(): void {}

	select_bank(bank_no: u2): void {}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.SwitchBank, ({ bank }) => {
			this.select_bank(bank);
		});
	}
}
