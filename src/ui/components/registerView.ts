import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { isU3, u3, u8 } from "../../num";
import CelledViewer from "../celledViewer";
import UiComponent from "../uiComponent";

export default class RegisterView extends CelledViewer implements UiComponent {
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(8, 1, element, (address: u8, value: u8) => {
			if (!isU3(address)) throw new Error("unreachable");
			this.cpu_signals.dispatch(UiCpuSignal.RequestRegisterChange, { register_no: address as u3, value });
		});
		this.events = events;
		this.cpu_signals = cpu_signals;

		this.events.listen(UiEvent.EditOn, () => {
			this.editor.enable();
			for (const cell of this.cells) cell.el.className = "";
		});
		this.events.listen(UiEvent.EditOff, () => {
			this.editor.disable();
			for (const cell of this.cells) cell.el.className = "";
		});
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => this.setCellValue(register_no, value));
		c.listen(CpuEvent.Reset, () => this.reset());
	}
}
