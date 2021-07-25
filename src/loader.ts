import {
	stringToCStr
} from './swf/util';
import {
	Tag
} from './swf/tag';
import {
	Swf
} from './swf/swf';

/**
 * Type string.
 *
 * @param str The string.
 * @returns Bytecode data.
 */
function asvm1TypeString(str: string) {
	return Buffer.concat([Buffer.alloc(1), stringToCStr(str)]);
}

/**
 * Action: ConstantPoolEnd.
 *
 * @param strs Constant strings.
 * @returns Bytecode data.
 */
function asmv1ActionConstantPool(strs: string[]) {
	const data = Buffer.concat([Buffer.alloc(5), ...strs.map(stringToCStr)]);
	data.writeUInt8(0x88, 0);
	data.writeUInt16LE(data.length - 3, 1);
	data.writeUInt16LE(strs.length, 3);
	return data;
}

/**
 * Type constant 8-bit.
 *
 * @param i Constant index.
 * @returns Bytecode data.
 */
function asvm1TypeConstant8(i: number) {
	const data = Buffer.alloc(2);
	data.writeUInt8(0x08, 0);
	data.writeUInt8(i, 1);
	return data;
}

/**
 * Action: Push.
 *
 * @param pushed Pushed data.
 * @returns Bytecode data.
 */
function asmv1ActionPush(pushed: Buffer[]) {
	const data = Buffer.concat([Buffer.alloc(3), ...pushed]);
	data.writeUInt8(0x96, 0);
	data.writeUInt16LE(data.length - 3, 1);
	return data;
}

/**
 * Action: LoadMovie.
 *
 * @returns Bytecode data.
 */
function asvm1ActionLoadMovie() {
	const data = Buffer.alloc(4);
	data.writeUInt8(0x9A, 0);
	data.writeUInt16LE(data.length - 3, 1);
	data.writeUInt8(0x40, 3);
	return data;
}

/**
 * Action: End.
 *
 * @returns Bytecode data.
 */
function asvm1ActionEnd() {
	return Buffer.alloc(1);
}

/**
 * Bytecode in SWF4 format.
 *
 * @param url The URL to load.
 * @returns Bytecode data.
 */
function bytecodeLoadMovieSwf4(url: string) {
	return Buffer.concat([
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
	return Buffer.concat([
		asmv1ActionConstantPool([url, '_level0']),
		asmv1ActionPush([
			asvm1TypeConstant8(0),
			asvm1TypeConstant8(1)
		]),
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
	setBackgroundColor.data = Buffer.alloc(3);
	// eslint-disable-next-line no-bitwise
	setBackgroundColor.data.writeUInt8(color & 0xFF, 2);
	// eslint-disable-next-line no-bitwise
	setBackgroundColor.data.writeUInt8((color >> 8) & 0xFF, 1);
	// eslint-disable-next-line no-bitwise
	setBackgroundColor.data.writeUInt8((color >> 16) & 0xFF, 0);
	swf.tags.push(setBackgroundColor);

	const showFrame = new Tag();
	showFrame.code = 1;
	for (let i = 0; i < delay; i++) {
		swf.tags.push(showFrame);
	}

	const doAction = new Tag();
	doAction.code = 12;
	doAction.data = swfv < 5 ?
		bytecodeLoadMovieSwf4(url) :
		bytecodeLoadMovieSwf5(url);
	swf.tags.push(doAction);

	swf.tags.push(showFrame);

	const end = new Tag();
	end.code = 0;
	swf.tags.push(end);

	return swf.encode();
}
