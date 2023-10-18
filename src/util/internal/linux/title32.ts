/* eslint-disable max-classes-per-file */

import {Elf32} from './elf';
import {PatchTitle, titleMatchM, titleMatchA} from './title';

/**
 * PatchTitle32 object.
 */
export abstract class PatchTitle32 extends PatchTitle<Elf32> {}

/**
 * Patch objects.
 */
export const title32 = [
	/**
	 * 6.0.79.0 i386.
	 */
	class extends PatchTitle32 {
		private _addr_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			for (const [shdr, i, d] of this._findFuzzyCode(
				[
					// call    _gtk_widget_show
					'E8 -- -- -- --',
					// pop     edi
					'5F',
					// pop     eax
					'58',
					// push    DWORD PTR ds:...
					'FF 35 -- -- -- --',
					// ...
					'-- -- --',
					// ...
					'-- -- --',
					// call    _gdk_window_set_title
					'E8 -- -- -- --'
				].join(' ')
			)) {
				const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
				const ptr = v.getUint32(i + 9, true);
				const shdr2 = this._getShdrForAddress(ptr);
				if (!shdr2) {
					continue;
				}
				const v2 = new DataView(shdr2.data);
				const i2 = ptr - shdr2.shAddr;
				const ptr2 = v2.getUint32(i2, true);
				const str = this._readCstr(ptr2);
				if (!str || !titleMatchM.test(str)) {
					continue;
				}
				this._addr_ = shdr.shAddr + i;
			}
			return !!this._addr_;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const addr = this._addr_;
			const shdr = this._theShdrForAddress(addr);
			const v = new DataView(shdr.data);
			let i = addr - shdr.shAddr + 7;

			// nop
			v.setUint8(i++, 0x90);

			// push     ...
			v.setUint8(i++, 0x68);
			v.setUint32(i, this._titleA, true);
		}
	},

	/**
	 * 9.0.115.0 i386.
	 */
	class extends PatchTitle32 {
		private _addrs_ = [] as number[];

		/**
		 * @inheritDoc
		 */
		public check() {
			this._addrs_ = [];
			for (const [shdr, i, d] of this._findFuzzyCode(
				[
					// call    _gtk_widget_show
					'E8 -- -- -- --',
					// mov     eax, DWORD PTR ds:....
					'A1 -- -- -- --',
					// mov     DWORD PTR [esp+0x4], eax
					'89 44 24 04',
					// ...
					'-- -- -- -- -- --',
					// ...
					'-- -- --',
					// mov     DWORD PTR [esp], eax
					'89 -- 24',
					// call    _gtk_window_set_title
					'E8 -- -- -- --'
				].join(' ')
			)) {
				const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
				const ptr = v.getUint32(i + 6, true);
				const shdr2 = this._getShdrForAddress(ptr);
				if (!shdr2) {
					continue;
				}
				const v2 = new DataView(shdr2.data);
				const i2 = ptr - shdr2.shAddr;
				const ptr2 = v2.getUint32(i2, true);
				const str = this._readCstr(ptr2);
				if (!str || !titleMatchA.test(str)) {
					continue;
				}
				this._addrs_.push(shdr.shAddr + i);
			}
			return this._addrs_.length === 2;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			for (const addr of this._addrs_) {
				const shdr = this._theShdrForAddress(addr);
				const v = new DataView(shdr.data);
				let i = addr - shdr.shAddr + 5;

				// mov     eax, ...
				v.setUint8(i++, 0xb8);
				v.setUint32(i, this._titleA, true);
			}
		}
	},

	/**
	 * 10.1.53.64 i386.
	 */
	class extends PatchTitle32 {
		private _addr_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			for (const [shdr, i, d] of this._findFuzzyCode(
				[
					// mov     DWORD PTR [esp+0x8], ...
					'C7 44 24 08 -- -- -- --',
					// mov     DWORD PTR [esp+0x4], ...
					'C7 44 24 04 -- -- -- --',
					// mov     DWORD PTR [esp], ...
					'89 -- 24',
					// call    ...
					'E8 -- -- -- --'
				].join(' ')
			)) {
				const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
				const addr = shdr.shAddr + i;
				const ptr = v.getUint32(i + 12, true);
				const len = v.getUint32(i + 4, true);
				const str = this._readCstr(ptr);
				if (!str || str.length !== len || !titleMatchA.test(str)) {
					continue;
				}
				if (this._addr_) {
					return false;
				}
				this._addr_ = addr;
			}
			return !!this._addr_;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const addr = this._addr_;
			const shdr = this._theShdrForAddress(addr);
			const v = new DataView(shdr.data);
			const i = addr - shdr.shAddr;
			v.setUint32(i + 12, this._titleA, true);
			v.setUint32(i + 4, this._titleL, true);
		}
	},

	/**
	 * 11.2.202.228 i386.
	 */
	class extends PatchTitle32 {
		private _addr_ = 0;

		private _ebx_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			for (const [shdr, i, d] of this._findFuzzyCode(
				[
					// lea     eax, [ebx+...]
					'8D 83 -- -- -- --',
					// mov     DWORD PTR [esp+0x4], eax
					'89 44 24 04',
					// mov     DWORD PTR [esp+0x8], ...
					'C7 44 24 08 -- -- -- --',
					// mov     DWORD PTR [esp], esi
					'89 34 24',
					// call    ...
					'E8 -- -- -- --'
				].join(' ')
			)) {
				const addr = shdr.shAddr + i;
				const ebx = this._findEbx(addr);
				if (ebx === null) {
					continue;
				}
				const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
				const ptr = ebx + v.getInt32(i + 2, true);
				const len = v.getUint32(i + 14, true);
				const str = this._readCstr(ptr);
				if (!str || str.length !== len || !titleMatchA.test(str)) {
					continue;
				}
				if (this._addr_) {
					return false;
				}
				this._addr_ = addr;
				this._ebx_ = ebx;
			}
			return !!this._addr_;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const addr = this._addr_;
			const ebx = this._ebx_;
			const shdr = this._theShdrForAddress(addr);
			const v = new DataView(shdr.data);
			const i = addr - shdr.shAddr;
			v.setInt32(i + 2, this._titleA - ebx, true);
			v.setUint32(i + 14, this._titleL, true);
		}
	}
] as (new (elf: Elf32, titleA: number, titleL: number) => PatchTitle32)[];
