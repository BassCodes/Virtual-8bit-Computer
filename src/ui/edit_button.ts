import { el, $ } from "../etc";
import { UiEventHandler, UiEvent } from "../events";
import { UiComponent } from "./uiComponent";

export class EditButton implements UiComponent {
	element: HTMLElement;
	events: UiEventHandler;
	constructor(element: HTMLElement, event: UiEventHandler) {
		this.element = element;
		this.events = event;

		const image = el("img");
		image.src = "pencil.png";
		image.style.width = "20px";
		image.style.height = "20px";
		this.element.classList.add("editor_toggle");
		this.element.addEventListener("click", () => this.edit_toggle());
		this.element.appendChild(image);
	}
	reset(): void {
		const is_on = this.element.classList.contains("on");
		if (is_on) {
			this.edit_toggle();
		}
	}

	edit_toggle(): void {
		const is_on = this.element.classList.contains("on");
		if (is_on) {
			this.element.classList.remove("on");
			$("root").classList.remove("editor");
			this.element.classList.add("off");
			this.events.dispatch(UiEvent.EditOff);
		} else {
			this.events.dispatch(UiEvent.EditOn);
			$("root").classList.add("editor");
			this.element.classList.add("on");
			this.element.classList.remove("off");
		}
	}
}
