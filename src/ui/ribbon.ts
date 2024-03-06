import { el, $ } from "../etc";
import { UiEventHandler, UiEvent } from "../events";
import { UiComponent } from "./uiComponent";

function new_button(name: string, img_path: string, additional_class?: string): HTMLButtonElement {
	const button = el("button", "", "no_style ribbon_button");
	const image = el("img");
	image.src = img_path;
	image.width = 64;
	image.height = 64;
	if (additional_class !== undefined) {
		button.classList.add(additional_class);
	}
	button.appendChild(image);
	return button;
}

export class Ribbon implements UiComponent {
	element: HTMLElement;
	events: UiEventHandler;
	edit_button: HTMLButtonElement;
	console_button: HTMLButtonElement;
	display_button: HTMLButtonElement;
	explainer_button: HTMLButtonElement;
	constructor(element: HTMLElement, event: UiEventHandler) {
		this.element = element;
		this.events = event;

		this.edit_button = new_button("Edit", "pencil.png", "editor_toggle");
		this.console_button = new_button("Console", "texout.png");
		this.display_button = new_button("Video", "tv.png");
		this.explainer_button = new_button("Explainer", "explainer.png");
		this.edit_button.addEventListener("click", () => this.edit_toggle());
		this.element.appendChild(this.edit_button);
		this.element.appendChild(this.console_button);
		this.element.appendChild(this.display_button);
		this.element.appendChild(this.explainer_button);
	}
	reset(): void {
		const is_on = this.edit_button.classList.contains("on");
		if (is_on) {
			this.edit_toggle();
		}
	}

	edit_toggle(): void {
		const is_on = this.edit_button.classList.contains("on");
		if (is_on) {
			this.edit_button.classList.remove("on");
			$("main").classList.remove("editor");
			this.edit_button.classList.add("off");
			this.events.dispatch(UiEvent.EditOff);
		} else {
			this.events.dispatch(UiEvent.EditOn);
			$("main").classList.add("editor");
			this.edit_button.classList.add("on");
			this.edit_button.classList.remove("off");
		}
	}
}
