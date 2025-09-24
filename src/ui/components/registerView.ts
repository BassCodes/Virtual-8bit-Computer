/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { CpuEvent, CpuEventHandler, UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { isU3, u3, u8 } from "../../num";
import CelledViewer from "../celledViewer";
import UiComponent from "../uiComponent";

export default class RegisterView extends CelledViewer implements UiComponent {
	events: UiEventHandler;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(8, 1, element, (a, v) => this.onEdit(a, v));
		this.events = events;
		this.cpu_signals = cpu_signals;

		// this.events.listen(UiEvent.EditOn, () => {
		// 	this.editor.enable();
		// 	for (const cell of this.cells) cell.el.className = "";
		// });
		// this.events.listen(UiEvent.EditOff, () => {
		// 	this.editor.disable();
		// 	for (const cell of this.cells) cell.el.className = "";
		// });
	}

	onEdit(address: u8, value: u8): void {
		if (!isU3(address)) throw new Error("unreachable");
		this.cpu_signals.dispatch(UiCpuSignal.RequestRegisterChange, { register_no: address as u3, value });
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => this.setCellValue(register_no, value));
	}

	softReset(): void {
		this.clearAllClasses();
	}
}
