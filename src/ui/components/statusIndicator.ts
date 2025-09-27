/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */

import { el } from "../../etc";
import { UiEventHandler, UiEvent } from "../../events";
import UiComponent from "../uiComponent";
import { ComputerStateUiRepresentation } from "./stateManager.js";

export default class StatusIndicator implements UiComponent {
	container: HTMLElement;
	indicator_element: HTMLElement;
	constructor(element: HTMLElement) {
		this.container = element;
		this.indicator_element = el("div").appendTo(this.container);
		this.setState("Ready");
	}

	setState(s: ComputerStateUiRepresentation): void {
		this.indicator_element.textContent = s;
	}

	initUiEvents(e: UiEventHandler): void {
		e.listen(UiEvent.StateChange, (s) => {
			this.setState(s);
		});
	}
}
