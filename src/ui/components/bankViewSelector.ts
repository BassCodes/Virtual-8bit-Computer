import { el } from "../../etc";
import { u2 } from "../../num";
import { UiEventHandler, UiEvent } from "../../events";
import UiComponent from "../uiComponent";

export default class BankSelector implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	private bank_buttons: Array<HTMLButtonElement>;
	constructor(element: HTMLElement, events: UiEventHandler) {
		this.container = element;
		this.events = events;

		const bank_boxes = el("div").id("bank_boxes").fin();
		this.bank_buttons = [];
		for (let i = 0; i < 4; i++) {
			const button = el("button").cl("nostyle").fin();
			bank_boxes.appendChild(button);
			button.addEventListener("click", () => {
				for (const b of this.bank_buttons) b.classList.remove("selected");
				button.classList.add("selected");
				this.events.dispatch(UiEvent.ChangeViewBank, { bank: i as u2 });
			});
			button.textContent = i.toString();
			this.bank_buttons.push(button);
		}
		this.bank_buttons[0].classList.add("selected");

		this.container.appendChild(bank_boxes);
	}
	reset(): void {
		for (const b of this.bank_buttons) b.classList.remove("selected");
		this.bank_buttons[0].classList.add("selected");
	}
}
