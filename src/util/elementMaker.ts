class ElementInProgress<E extends HTMLElement> {
	private element: E;
	constructor(el: E) {
		this.element = el;
	}

	/** Set attribute */
	at(name: string, value: string): ElementInProgress<E> {
		this.element.setAttribute(name, value);
		return this;
	}

	/** Set id */
	id(id: string): ElementInProgress<E> {
		this.element.id = id;
		return this;
	}

	/** Add class */
	cl(class_name: string): ElementInProgress<E> {
		this.element.classList.add(class_name);
		return this;
	}

	/** Add event listener */
	ev(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): ElementInProgress<E> {
		this.element.addEventListener(type, listener, options);
		return this;
	}

	/** Append child */
	ch<F extends HTMLElement>(child: HTMLElement | ElementInProgress<F>): ElementInProgress<E> {
		if (child instanceof ElementInProgress) {
			this.element.appendChild(child.fin());
		} else {
			this.element.appendChild(child);
		}
		return this;
	}

	/** Set textContent */
	tx(text_contents: string): ElementInProgress<E> {
		this.element.textContent = text_contents;
		return this;
	}

	/** Set innerHTML */
	ht(html: string): ElementInProgress<E> {
		this.element.innerHTML = html;
		return this;
	}

	/** Set style */
	st(name: string, value: string): ElementInProgress<E> {
		this.element.style.setProperty(name, value);
		return this;
	}

	/** Set title */
	ti(title: string): ElementInProgress<E> {
		this.element.title = title;
		return this;
	}

	/** Return created element */
	fin(): E {
		return this.element;
	}
	/** custom logic */
	map(f: (e: E) => void): ElementInProgress<E> {
		f(this.element);
		return this;
	}

	appendTo<F extends HTMLElement>(parent: HTMLElement | ElementInProgress<F>): E {
		if (parent instanceof ElementInProgress) {
			parent.ch(this);
		} else {
			parent.appendChild(this.fin());
		}
		return this.element;
	}
}

export default function el<E extends keyof HTMLElementTagNameMap>(
	name: E
): ElementInProgress<HTMLElementTagNameMap[E]> {
	const element = document.createElement(name);
	return new ElementInProgress(element);
}
