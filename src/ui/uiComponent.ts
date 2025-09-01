/**
 * @file Definition of what a UI component is in the context of this program
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { CpuEventHandler, UiCpuSignalHandler, UiEventHandler } from "../events";

// A UiComponent represents one DOM element and its contents.
// A UiComponent reacts to events to change its state, and creates events when it wants to communicate with other UiComponents, or with the CPU.
// These event/signal handlers are available to each UiComponent:
//  - UiEventHandler: dispatch/listen to events created as a result of Ui actions
//  - CpuEventHandler: listen to events created as a result of CPU actions
//	- UiCpuEventSignaler: dispatch signals to request actions from the CPU

export default interface UiComponent {
	container: HTMLElement;
	/** Allows listening and emitting UiEvents*/
	events: UiEventHandler;
	/** Creating signals for the cpu to process */
	cpu_signals?: UiCpuSignalHandler;
	/** Completely reset the state of the component */
	reset?: () => void;
	softReset?: () => void;
	/**  Allows listening CPUEvents*/
	initCpuEvents?: (c: CpuEventHandler) => void;
}

export interface UiComponentConstructor {
	new (el: HTMLElement, ui_event_handler: UiEventHandler, cpu_signaler: UiCpuSignalHandler): UiComponent;
}
