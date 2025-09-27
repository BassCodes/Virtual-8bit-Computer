/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { CpuEvent, CpuEventHandler } from "../../events";
import CelledViewer from "../celledViewer";
import UiComponent from "../uiComponent";

export default class RegisterView extends CelledViewer implements UiComponent {
	constructor(element: HTMLElement) {
		super(8, 1, element);
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.RegisterChanged, ({ register_no, value }) => this.setCellValue(register_no, value));
	}

	softReset(): void {
		this.clearAllClasses();
	}
}
