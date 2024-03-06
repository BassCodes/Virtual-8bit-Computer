/**
 * @file Definition of what a UI component is in the context of this program
 * @copyright Alexander Bass 2024
 * @license GPL-3.0
 */
import { CpuEventHandler, UiEventHandler } from "../events";

export interface UiComponent {
	element: HTMLElement;
	/** Allows listening and emitting UiEvents*/
	events: UiEventHandler;
	reset: () => void;
	/**  Allows listening CPUEvents*/
	init_cpu_events?: (c: CpuEventHandler) => void;
}

export interface UiComponentConstructor {
	new (el: HTMLElement, ue: UiEventHandler): UiComponent;
}
