// This file is injected before all other code to provide fs stub
// It creates a global fs module that can be used by Ink
globalThis.__fs_stub = {
	readFileSync: () => '',
	writeFileSync: () => {},
	existsSync: () => false,
	mkdirSync: () => {},
	readdirSync: () => [],
	statSync: () => ({ isDirectory: () => false, isFile: () => false }),
	unlinkSync: () => {},
	rmdirSync: () => {},
	renameSync: () => {},
	copyFileSync: () => {},
	accessSync: () => {},
	chmodSync: () => {},
	constants: { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 },
};
