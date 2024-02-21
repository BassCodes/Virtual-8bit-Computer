export class Event<T> {
	identifier: T;
	callbacks: Array<(event_data: unknown) => void> = [];
	constructor(identifier: T) {
		this.identifier = identifier;
	}
}

export class EventHandler<T> {
	events: Array<Event<T>> = [];
	private sealed: boolean;
	constructor() {
		this.sealed = false;
	}

	seal(): void {
		if (this.sealed) {
			throw new Error("Already Sealed");
		}
		this.sealed = true;
	}

	register_event(identifier: T): void {
		if (this.sealed) {
			throw new Error("Can't add event to sealed event handler");
		}
		const event = new Event<T>(identifier);
		this.events.push(event);
	}
	dispatch(identifier: T, event_data?: unknown): void {
		const event = this.events.find((e) => e.identifier === identifier);
		if (event === undefined) {
			throw new Error("Event not found");
		}
		for (const callback of event.callbacks) {
			callback(event_data);
		}
	}
	listen(identifier: T, callback: (event_data: unknown) => void): void {
		if (!this.sealed) throw new Error("Event handler must be sealed before adding listener");
		const event = this.events.find((e) => e.identifier === identifier);
		if (event === undefined) {
			throw new Error("No event found given identifier");
		}
		event.callbacks.push(callback);
	}
}
