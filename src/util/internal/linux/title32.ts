/* eslint-disable max-classes-per-file */

import {Elf32} from './elf';
import {PatchTitle, titleMatchM, titleMatchA} from './title';

/**
 * PatchTitle32 object.
 */
export abstract class PatchTitle32 extends PatchTitle<Elf32> {}

/**
 * Patch object.
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
				const ptr = d.readUint32LE(i + 9);
				const shdr2 = this._getShdrForAddress(ptr);
				if (!shdr2) {
					continue;
				}
				const d2 = Buffer.from(shdr2.data);
				const i2 = ptr - shdr2.shAddr;
				const ptr2 = d2.readUint32LE(i2);
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
			const d = Buffer.from(shdr.data);
			let i = addr - shdr.shAddr + 7;

			// nop
			d.writeUInt8(0x90, i++);

			// push     ...
			d.writeUInt8(0x68, i++);
			d.writeInt32LE(this._titleA, i);
			i += 4;
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
				const ptr = d.readUint32LE(i + 6);
				const shdr2 = this._getShdrForAddress(ptr);
				if (!shdr2) {
					continue;
				}
				const d2 = Buffer.from(shdr2.data);
				const i2 = ptr - shdr2.shAddr;
				const ptr2 = d2.readUint32LE(i2);
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
				const d = Buffer.from(shdr.data);
				let i = addr - shdr.shAddr + 5;

				// mov     eax, ...
				d.writeUInt8(0xb8, i++);
				d.writeInt32LE(this._titleA, i);
				i += 4;
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
				const addr = shdr.shAddr + i;
				const ptr = d.readInt32LE(i + 12);
				const len = d.readUInt32LE(i + 4);
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
			const d = Buffer.from(shdr.data);
			const i = addr - shdr.shAddr;
			d.writeUint32LE(this._titleA, i + 12);
			d.writeUint32LE(this._titleL, i + 4);
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
				const ptr = ebx + d.readInt32LE(i + 2);
				const len = d.readUInt32LE(i + 14);
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
			const d = Buffer.from(shdr.data);
			const i = addr - shdr.shAddr;
			d.writeInt32LE(this._titleA - ebx, i + 2);
			d.writeUint32LE(this._titleL, i + 14);
		}
	}
] as (new (elf: Elf32, titleA: number, titleL: number) => PatchTitle32)[];
