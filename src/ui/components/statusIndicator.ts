/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */

import { el } from "../../etc";
import { UiEventHandler, UiCpuSignalHandler, UiEvent } from "../../events";
import UiComponent from "../uiComponent";
import { ComputerStateUiRepresentation } from "./stateManager.js";

export default class StatusIndicator implements UiComponent {
	container: HTMLElement;
	indicator_element: HTMLElement;
	events: UiEventHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.indicator_element = el("div").appendTo(this.container);
		this.setState("Ready");

		this.events.listen(UiEvent.StateChange, (s) => {
			this.setState(s);
		});
	}

	setState(s: ComputerStateUiRepresentation): void {
		this.indicator_element.textContent = s;
	}
}
