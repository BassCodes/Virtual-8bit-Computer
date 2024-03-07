import { el } from "../etc";
export abstract class WindowBox {
	element: HTMLElement;
	readonly title: string;
	title_bar: HTMLElement;
	private resize: HTMLElement;
	private collapse_button: HTMLButtonElement;
	private collapsed: boolean = false;
	private resize_func: (e: MouseEvent) => void;

	constructor(element: HTMLElement, title: string, options?: { collapsed?: boolean }) {
		this.element = element;
		this.title = title;
		this.element.classList.add("window");
		this.title_bar = el("div", undefined, "window_title");
		this.element.appendChild(this.title_bar);
		const title_bar_text_box = el("div", "text");
		title_bar_text_box.textContent = title;
		this.title_bar.appendChild(title_bar_text_box);
		this.resize = el("div", "resize");
		this.element.appendChild(this.resize);
		this.resize_func = this.resize_move.bind(this);
		this.collapse_button = el("button", "collapse_button", "nostyle");
		this.collapse_button.addEventListener("click", () => {
			this.toggle_collapse();
		});
		this.title_bar.appendChild(this.collapse_button);
		this.resize.addEventListener("mousedown", (e) => {
			window.addEventListener("mousemove", this.resize_func);
		});
		window.addEventListener("mouseup", () => {
			this.remove_resize_listeners();
		});
		window.addEventListener("mouseleave", () => {
			this.remove_resize_listeners();
		});
		if (options?.collapsed) {
			this.collapse();
		}
	}

	collapse(): void {
		this.element.classList.add("collapsed");
		this.remove_resize_listeners();
		this.resize.style.visibility = "hidden";
		this.element.style.height = `${this.title_bar.offsetHeight + 4}px`;
		this.collapsed = true;
	}

	toggle_collapse(): void {
		if (this.collapsed) {
			this.uncollapse();
		} else {
			this.collapse();
		}
	}

	uncollapse(): void {
		this.element.classList.remove("collapsed");
		this.resize.style.visibility = "unset";
		this.element.style.height = `${this.title_bar.offsetHeight + 10 + 200}px`;
		this.collapsed = false;
	}

	remove_resize_listeners(): void {
		window.removeEventListener("mousemove", this.resize_func);
	}

	resize_move(e: MouseEvent): void {
		if (this.collapsed) {
			this.uncollapse();
			this.remove_resize_listeners();
			return;
		}
		const distance_to_title = e.clientY - this.element.offsetTop - this.title_bar.offsetHeight + window.scrollY + 5;
		if (distance_to_title <= 5) {
			this.collapse();
			return;
		}
		this.element.style.height = `${e.clientY - this.element.offsetTop + window.scrollY + 8}px`;
	}
}
