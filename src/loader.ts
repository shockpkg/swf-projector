import {stringEncode} from './swf/util.ts';
import {Tag} from './swf/tag.ts';
import {Swf} from './swf/swf.ts';
import {concat} from './util/internal/data.ts';

/**
 * Type string.
 *
 * @param str The string.
 * @returns Bytecode data.
 */
function asvm1TypeString(str: string) {
	return concat([new Uint8Array(1), stringEncode(str)]);
}

/**
 * Action: ConstantPoolEnd.
 *
 * @param strs Constant strings.
 * @returns Bytecode data.
 */
function asmv1ActionConstantPool(strs: string[]) {
	const data = concat([new Uint8Array(5), ...strs.map(stringEncode)]);
	const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
	data[0] = 0x88;
	v.setUint16(1, data.length - 3, true);
	v.setUint16(3, strs.length, true);
	return data;
}

/**
 * Type constant 8-bit.
 *
 * @param i Constant index.
 * @returns Bytecode data.
 */
function asvm1TypeConstant8(i: number) {
	const data = new Uint8Array(2);
	data[0] = 0x08;
	data[1] = i;
	return data;
}

/**
 * Action: Push.
 *
 * @param pushed Pushed data.
 * @returns Bytecode data.
 */
function asmv1ActionPush(pushed: Uint8Array[]) {
	const data = concat([new Uint8Array(3), ...pushed]);
	const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
	data[0] = 0x96;
	v.setUint16(1, data.length - 3, true);
	return data;
}

/**
 * Action: LoadMovie.
 *
 * @returns Bytecode data.
 */
function asvm1ActionLoadMovie() {
	const data = new Uint8Array(4);
	const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
	data[0] = 0x9a;
	v.setUint16(1, data.length - 3, true);
	v.setUint8(3, 0x40);
	return data;
}

/**
 * Action: End.
 *
 * @returns Bytecode data.
 */
function asvm1ActionEnd() {
	return new Uint8Array(1);
}

/**
 * Bytecode in SWF4 format.
 *
 * @param url The URL to load.
 * @returns Bytecode data.
 */
function bytecodeLoadMovieSwf4(url: string) {
	return concat([
		asmv1ActionPush([asvm1TypeString(url)]),
		asmv1ActionPush([asvm1TypeString('/')]),
		asvm1ActionLoadMovie(),
		asvm1ActionEnd()
	]);
}

/**
 * Bytecode in SWF5 format.
 *
 * @param url The URL to load.
 * @returns Bytecode data.
 */
function bytecodeLoadMovieSwf5(url: string) {
	return concat([
		asmv1ActionConstantPool([url, '_level0']),
		asmv1ActionPush([asvm1TypeConstant8(0), asvm1TypeConstant8(1)]),
		asvm1ActionLoadMovie(),
		asvm1ActionEnd()
	]);
}

/**
 * Generate a loader stub SWF movie.
 * Optionally include a delay to give player a change to initialize first.
 *
 * @param swfv SWF format version number.
 * @param width Frame width.
 * @param height Frame height.
 * @param fps Frames-per-second.
 * @param color Background color.
 * @param url The URL to load.
 * @param delay Number of frame to delay loading.
 * @returns Movie data.
 */
export function loader(
	swfv: number,
	width: number,
	height: number,
	fps: number,
	color: number,
	url: string,
	delay = 0
) {
	if (swfv < 4) {
		throw new Error('SWF format version must be 4+');
	}
	delay = delay < 0 ? 0 : delay;

	const swf = new Swf();
	swf.version = swfv;
	swf.frameSize.xMax = Math.round(width * 20);
	swf.frameSize.yMax = Math.round(height * 20);
	swf.frameRate.value = fps;
	swf.frameCount = delay + 1;

	const setBackgroundColor = new Tag();
	setBackgroundColor.code = 9;
	setBackgroundColor.data = new Uint8Array(3);
	// eslint-disable-next-line no-bitwise
	setBackgroundColor.data[2] = color & 0xff;
	// eslint-disable-next-line no-bitwise
	setBackgroundColor.data[1] = (color >> 8) & 0xff;
	// eslint-disable-next-line no-bitwise
	setBackgroundColor.data[0] = (color >> 16) & 0xff;
	swf.tags.push(setBackgroundColor);

	const showFrame = new Tag();
	showFrame.code = 1;
	for (let i = 0; i < delay; i++) {
		swf.tags.push(showFrame);
	}

	const doAction = new Tag();
	doAction.code = 12;
	doAction.data =
		swfv < 5 ? bytecodeLoadMovieSwf4(url) : bytecodeLoadMovieSwf5(url);
	swf.tags.push(doAction, showFrame);

	const end = new Tag();
	end.code = 0;
	swf.tags.push(end);

	return swf.encode();
}
