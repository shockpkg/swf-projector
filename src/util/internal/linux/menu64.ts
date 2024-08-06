/* eslint-disable max-classes-per-file */

import {MENU_X8664} from './asm.ts';
import {Elf64} from './elf.ts';
import {PatchMenu} from './menu.ts';

/**
 * PatchMenu64 object.
 */
export abstract class PatchMenu64 extends PatchMenu<Elf64> {}

/**
 * Patch objects.
 */
export const menu64 = [
	/**
	 * 24.0.0.186 x86_64.
	 */
	class extends PatchMenu64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: MENU_X8664['24-widget-a'],
				replace: MENU_X8664['24-widget-b']
			},
			{
				count: 1,
				find: MENU_X8664['24-menu-a'],
				replace: MENU_X8664['24-menu-b']
			}
		];
	},

	/**
	 * 32.0.0.293 x86_64.
	 */
	class extends PatchMenu64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: MENU_X8664['32-widget-a'],
				replace: MENU_X8664['32-widget-b']
			},
			{
				count: 1,
				find: MENU_X8664['32-menu-a'],
				replace: MENU_X8664['32-menu-b']
			}
		];
	}
] as (new (elf: Elf64) => PatchMenu64)[];
