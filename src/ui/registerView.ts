import { CpuEvent, CpuEventHandler, UiEventHandler } from "../events";
import { CelledViewer } from "./celledViewer";
import { UiComponent } from "./uiComponent";

export class RegisterView extends CelledViewer implements UiComponent {
	events: UiEventHandler;
	constructor(element: HTMLElement, e: UiEventHandler) {
		super(8, 1, element);
		this.events = e;
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => {
			this.set_cell_value(register_no, value);
		});
	}
}
