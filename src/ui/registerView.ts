import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../events";
import { u3 } from "../num";
import { CelledViewer } from "./celledViewer";
import { EditorContext } from "./editableHex";
import { UiComponent } from "./uiComponent";

export class RegisterView extends CelledViewer implements UiComponent {
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(8, 1, element);
		this.events = events;
		this.cpu_signals = cpu_signals;

		const list = this.cells.map((c) => c.el);
		const editor = new EditorContext(list, this.width, (i, value) => {
			this.cpu_signals.dispatch(UiCpuSignal.RequestRegisterChange, { register_no: i as u3, value });
		});
		this.events.listen(UiEvent.EditOn, () => {
			editor.enable();
			for (const cell of this.cells) {
				cell.el.className = "";
			}
		});
		this.events.listen(UiEvent.EditOff, () => {
			editor.disable();
			for (const cell of this.cells) {
				cell.el.className = "";
			}
		});
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => {
			this.set_cell_value(register_no, value);
		});
	}
}
