/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
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
	private is_collapsed = false;
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

		el("div").id("text").tx(title).appendTo(this.title_bar);
		this.collapse_button = el("button")
			.id("collapse_button")
			.ev("click", () => this.toggleCollapse())
			.cl("nostyle")
			.appendTo(this.title_bar);

		if (options?.collapsed) this.collapse();

		if (options?.fit_content) {
			this.fit_content = true;
		} else {
			this.resize = el("div")
				.id("resize")
				.ev("mousedown", () => {
					if (this.resize_func) window.addEventListener("mousemove", this.resize_func);
				})
				.appendTo(this.container);
			this.resize_func = this.resizeMove.bind(this);
			window.addEventListener("mouseup", () => this.removeResizeListeners());
			window.addEventListener("mouseleave", () => this.removeResizeListeners());
		}
	}

	collapse(): void {
		this.container.classList.add("collapsed");
		this.removeResizeListeners();
		if (this.resize) this.resize.style.visibility = "hidden";
		this.setHeight(this.title_bar.offsetHeight - BORDER_STROKE);
		this.is_collapsed = true;
	}

	correctHeightValue(height: number): number {
		if (this.fit_content) {
			let height_sum = 0;
			for (const c of this.container.children) {
				height_sum += (<HTMLElement>c).offsetHeight;
			}
			return height_sum;
		}

		return height;
	}

	toggleCollapse(): void {
		if (this.is_collapsed) {
			this.uncollapse();
		} else {
			this.collapse();
		}
	}

	setHeight(height: number): void {
		this.container.style.height = `${height + 2 * BORDER_STROKE}px`;
	}

	uncollapse(): void {
		this.container.classList.remove("collapsed");
		if (this.resize) this.resize.style.visibility = "unset";
		const new_height = this.correctHeightValue(this.title_bar.offsetHeight + 200);
		this.setHeight(new_height);

		this.is_collapsed = false;
	}

	removeResizeListeners(): void {
		if (this.resize_func) window.removeEventListener("mousemove", this.resize_func);
	}

	resizeMove(e: MouseEvent): void {
		if (this.is_collapsed) {
			this.uncollapse();
			this.removeResizeListeners();
			return;
		}
		const distance_to_title = e.clientY - this.container.offsetTop - this.title_bar.offsetHeight + window.scrollY + 5;
		if (distance_to_title <= 5) {
			this.collapse();
			return;
		}
		this.setHeight(e.clientY - this.container.offsetTop + window.scrollY);
	}

	isCollapsed(): boolean {
		return this.is_collapsed;
	}
}
