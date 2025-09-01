/**
 * @file Generic Event handler similar to the DOM event handlers
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */

export class Event<T> {
	identifier: T;
	callbacks: Array<(event_data: unknown) => void> = [];
	constructor(identifier: T) {
		this.identifier = identifier;
	}
}

export class EventHandler<T> {
	events: Array<Event<T>> = [];

	dispatch(identifier: T, event_data?: unknown): void {
		const event = this.events.find((e) => e.identifier === identifier);
		if (event === undefined) {
			// throw new Error("Event not found");
			console.log(`Event for ${identifier} was dispatched without any listeners. Data:`, event_data);
			return;
		}
		for (const callback of event.callbacks) {
			callback(event_data);
		}
	}

	/**
	 * Listens to all events with one listener. Ideally used for debugging
	 * @param callback called for event called on this event handler
	 */
	firehose(callback: (identifier: T, data: unknown) => void): void {
		this.events.forEach((e) => {
			const identifier = e.identifier;
			e.callbacks.push(callback.bind(undefined, identifier));
		});
	}
	listen(identifier: T, callback: (event_data: unknown) => void): void {
		let event = this.events.find((e) => e.identifier === identifier);
		if (event === undefined) {
			// If no event found, create it.
			// Type system is used to verify that events are valid.
			// If this were plain JS, a registerEvent method would likely be better to avoid listening to events that will never exist.
			event = new Event(identifier);
			this.events.push(event);
		}
		event.callbacks.push(callback);
	}
}
