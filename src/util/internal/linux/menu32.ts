/* eslint-disable max-classes-per-file */

import {MENU_I386} from './asm.ts';
import {Elf32} from './elf.ts';
import {PatchMenu} from './menu.ts';

/**
 * PatchMenu32 object.
 */
export abstract class PatchMenu32 extends PatchMenu<Elf32> {}

/**
 * Patch objects.
 */
export const menu32 = [
	/**
	 * 6.0.79.0 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: MENU_I386['6-widget-a'],
				replace: MENU_I386['6-widget-b']
			}
		];
	},

	/**
	 * 9.0.115.0 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 2,
				find: MENU_I386['9-widget-a'],
				replace: MENU_I386['9-widget-b']
			},
			{
				count: 2,
				find: MENU_I386['9-menu-a'],
				replace: MENU_I386['9-menu-b']
			}
		];
	},

	/**
	 * 10.0.12.36 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 2,
				find: MENU_I386['10.0-widget-a'],
				replace: MENU_I386['10.0-widget-b']
			},
			{
				count: 1,
				find: MENU_I386['10.0-menu-1-a'],
				replace: MENU_I386['10.0-menu-1-b']
			},
			{
				count: 1,
				find: MENU_I386['10.0-menu-2-a'],
				replace: MENU_I386['10.0-menu-2-b']
			}
		];
	},

	/**
	 * 10.1.53.64 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: MENU_I386['10.1-widget-a'],
				replace: MENU_I386['10.1-widget-b']
			},
			{
				count: 1,
				find: MENU_I386['10.1-menu-a'],
				replace: MENU_I386['10.1-menu-b']
			}
		];
	},

	/**
	 * 11.0.1.152 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: MENU_I386['11.0-widget-a'],
				replace: MENU_I386['11.0-widget-b']
			},
			{
				count: 1,
				find: MENU_I386['11.0-menu-a'],
				replace: MENU_I386['11.0-menu-b']
			}
		];
	},

	/**
	 * 11.2.202.228 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: MENU_I386['11.2-widget-a'],
				replace: MENU_I386['11.2-widget-b']
			},
			{
				count: 1,
				find: MENU_I386['11.2-menu-a'],
				replace: MENU_I386['11.2-menu-b']
			}
		];
	}
] as (new (elf: Elf32) => PatchMenu32)[];
