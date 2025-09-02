/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el, $ } from "../../etc";
import { UiEventHandler, UiEvent } from "../../events";
import UiComponent from "../uiComponent";

const DEFAULT_FILENAME = "New Program";

export default class TitleBox implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	private input: HTMLInputElement;
	constructor(element: HTMLElement, event: UiEventHandler) {
		this.container = element;
		this.events = event;
		this.input = el("input").at("type", "text").at("value", DEFAULT_FILENAME).appendTo(this.container);

		this.events.listen(UiEvent.FileNameChange, (n) => {
			this.setName(n);
		});
		this.events.listen(UiEvent.RequestFilename, (callback) => {
			callback(this.getName());
		});
	}

	setName(name: string): void {
		this.input.value = name;
	}

	getName(): string {
		return this.input.value;
	}

	reset(): void {
		this.setName(DEFAULT_FILENAME);
	}
}
