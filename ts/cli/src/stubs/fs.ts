// Browser stub for Node.js 'fs' module
// This is used when bundling for browser to avoid Node.js dependencies

export const readFileSync = () => '';
export const writeFileSync = () => {};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const readdirSync = () => [];
export const statSync = () => ({ isDirectory: () => false, isFile: () => false });
export const unlinkSync = () => {};
export const rmdirSync = () => {};
export const renameSync = () => {};
export const copyFileSync = () => {};
export const accessSync = () => {};
export const chmodSync = () => {};
export const constants = {
	F_OK: 0,
	R_OK: 4,
	W_OK: 2,
	X_OK: 1,
};

export default {
	readFileSync,
	writeFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	statSync,
	unlinkSync,
	rmdirSync,
	renameSync,
	copyFileSync,
	accessSync,
	chmodSync,
	constants,
};
