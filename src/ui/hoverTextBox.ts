import { el } from "../etc";

type RelativePosition = "top" | "bottom" | "left" | "right";

export default class HoverTextBox {
	parent: HTMLElement;
	position: RelativePosition;
	gap: number;
	contents: HTMLElement;
	shown: false | { container: HTMLElement; resize_event_fn: () => void };
	constructor(parent: HTMLElement, contents: HTMLElement, position: RelativePosition, gap: number) {
		this.gap = gap;
		this.position = position;
		this.parent = parent;
		this.contents = contents;
		this.shown = false;
	}

	show(): void {
		if (this.shown) return;
		const container = el("div").st("position", "absolute").cl("hover_text_box").fin();
		container.appendChild(this.contents);
		const adjustBoxPosition = (cont: HTMLElement, parent: HTMLElement): void => {
			const parent_x = parent.offsetLeft;
			const parent_y = parent.offsetTop;
			const style = window.getComputedStyle(cont);

			const new_cont_x = parent_x;
			const new_cont_y = parent_y + this.gap + cont.offsetHeight + 5;

			cont.style.setProperty("top", `${new_cont_y}px`);
			cont.style.setProperty("left", `${new_cont_x}px`);
		};
		document.body.appendChild(container);
		adjustBoxPosition(container, this.parent);
		const adjust_fn = adjustBoxPosition.bind(undefined, container, this.parent);
		window.addEventListener("resize", adjust_fn);
		this.shown = { container: container, resize_event_fn: adjust_fn };
	}

	hide(): void {
		if (!this.shown) return;
		this.shown.container.innerHTML = "";
		this.shown.container.remove();
		window.removeEventListener("resize", this.shown.resize_event_fn);
		this.shown = false;
	}
}
