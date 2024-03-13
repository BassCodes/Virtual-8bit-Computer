import { el } from "../etc";

interface WindowBoxOptions {
	collapsed?: boolean;
	fit_content?: boolean;
}

const BORDER_STROKE = 5; // px

export default abstract class WindowBox {
	container: HTMLElement;
	title_bar: HTMLElement;
	readonly title: string;
	private collapse_button: HTMLButtonElement;
	private collapsed = false;
	private fit_content = false;
	private resize?: HTMLElement;
	private resize_func?: (e: MouseEvent) => void;

	constructor(element: HTMLElement, title: string, options?: WindowBoxOptions) {
		this.container = element;
		this.title = title;

		this.container.classList.add("window");
		this.title_bar = el("div").cl("window_title").fin();
		if (this.container.firstChild !== null) {
			this.container.firstChild.before(this.title_bar);
		} else {
			this.container.appendChild(this.title_bar);
		}
		const title_bar_text_box = el("div").id("text").fin();
		title_bar_text_box.textContent = title;

		this.collapse_button = el("button").id("collapse_button").cl("nostyle").fin();
		this.collapse_button.addEventListener("click", () => this.toggle_collapse());

		this.title_bar.appendChild(title_bar_text_box);
		this.title_bar.appendChild(this.collapse_button);

		if (options?.collapsed) this.collapse();

		if (options?.fit_content) {
			this.fit_content = true;
		} else {
			this.resize = el("div").id("resize").fin();
			this.container.appendChild(this.resize);
			this.resize_func = this.resize_move.bind(this);
			this.resize.addEventListener("mousedown", (e) => {
				if (this.resize_func) window.addEventListener("mousemove", this.resize_func);
			});
			window.addEventListener("mouseup", () => this.remove_resize_listeners());
			window.addEventListener("mouseleave", () => this.remove_resize_listeners());
		}
	}

	collapse(): void {
		this.container.classList.add("collapsed");
		this.remove_resize_listeners();
		if (this.resize) this.resize.style.visibility = "hidden";
		this.set_height(this.title_bar.offsetHeight - BORDER_STROKE);
		this.collapsed = true;
	}

	correct_height_value(height: number): number {
		if (this.fit_content) {
			let height_sum = 0;
			for (const c of this.container.children) {
				height_sum += (<HTMLElement>c).offsetHeight;
			}
			return height_sum;
		}

		return height;
	}

	toggle_collapse(): void {
		if (this.collapsed) {
			this.uncollapse();
		} else {
			this.collapse();
		}
	}

	set_height(height: number): void {
		this.container.style.height = `${height + 2 * BORDER_STROKE}px`;
	}

	uncollapse(): void {
		this.container.classList.remove("collapsed");
		if (this.resize) this.resize.style.visibility = "unset";
		const new_height = this.correct_height_value(this.title_bar.offsetHeight + 200);
		this.set_height(new_height);

		this.collapsed = false;
	}

	remove_resize_listeners(): void {
		if (this.resize_func) window.removeEventListener("mousemove", this.resize_func);
	}

	resize_move(e: MouseEvent): void {
		if (this.collapsed) {
			this.uncollapse();
			this.remove_resize_listeners();
			return;
		}
		const distance_to_title = e.clientY - this.container.offsetTop - this.title_bar.offsetHeight + window.scrollY + 5;
		if (distance_to_title <= 5) {
			this.collapse();
			return;
		}
		this.set_height(e.clientY - this.container.offsetTop + window.scrollY);
	}
}
