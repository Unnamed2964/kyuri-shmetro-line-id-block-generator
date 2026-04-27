const SIGNATURE_FONT_SIZE = 2048;
const SIGNATURE_GLYPHS = ['0', '1', '4', '8'] as const;
const WINDOWS_ARIAL_SIGNATURE = [1139, 1139, 1139, 1139] as const;
const SIGNATURE_TOLERANCE = 30;

const DEBUG_PREFIX = '[arial-signature]';

function logDebug(message: string, details?: Record<string, unknown>) {
	if (details) {
		console.debug(DEBUG_PREFIX, message, details);
		return;
	}

	console.debug(DEBUG_PREFIX, message);
}

function measureSignature(targetDocument: Document, fontFamily: string) {
	const canvas = targetDocument.createElement('canvas');
	const context = canvas.getContext('2d');

	if (!context) {
		console.warn(DEBUG_PREFIX, 'Canvas 2D context unavailable during font measurement.');
		return null;
	}

	const font = `400 ${SIGNATURE_FONT_SIZE}px ${fontFamily}`;
	context.font = font;
	const widths = SIGNATURE_GLYPHS.map((glyph) => {
		const width = context.measureText(glyph).width;
		logDebug('Measured glyph width.', { glyph, width, font });
		return width;
	});

	logDebug('Completed Canvas font signature measurement.', {
		fontFamily,
		font,
		widths
	});

	return widths;
}

function matchesWindowsArialSignature(widths: readonly number[]) {
	const deltas = widths.map((width, index) => width - WINDOWS_ARIAL_SIGNATURE[index]);
	const matches = widths.every((width, index) => Math.abs(width - WINDOWS_ARIAL_SIGNATURE[index]) <= SIGNATURE_TOLERANCE);

	logDebug('Compared measured signature against Windows Arial baseline.', {
		widths,
		expected: WINDOWS_ARIAL_SIGNATURE,
		deltas,
		tolerance: SIGNATURE_TOLERANCE,
		matches
	});

	return matches;
}

async function detectWindowsArialInDocument(targetDocument: Document) {
	logDebug('Waiting for document fonts to become ready.');
	await targetDocument.fonts.ready;
	logDebug('Document fonts are ready. Starting Arial measurement.');
	const widths = measureSignature(targetDocument, 'Arial');
	const detected = widths ? matchesWindowsArialSignature(widths) : false;

	logDebug('Finished Arial detection inside isolated document.', {
		measured: Boolean(widths),
		detected
	});

	return detected;
}

export async function detectWindowsArial() {
	logDebug('Creating isolated iframe for Arial detection.');
	const iframe = document.createElement('iframe');
	iframe.setAttribute('aria-hidden', 'true');
	iframe.tabIndex = -1;
	iframe.src = 'about:blank';
	iframe.style.position = 'fixed';
	iframe.style.inlineSize = '0';
	iframe.style.blockSize = '0';
	iframe.style.opacity = '0';
	iframe.style.pointerEvents = 'none';
	iframe.style.border = '0';

	const loaded = new Promise<void>((resolve) => {
		iframe.addEventListener('load', () => resolve(), { once: true });
	});

	document.body.append(iframe);

	try {
		await loaded;
		logDebug('Detection iframe loaded.');
		const frameDocument = iframe.contentDocument;
		if (!frameDocument) {
			console.warn(DEBUG_PREFIX, 'Iframe loaded without an accessible document.');
			return false;
		}

		const detected = await detectWindowsArialInDocument(frameDocument);
		logDebug('Arial detection completed.', { detected });
		return detected;
	} finally {
		logDebug('Removing detection iframe.');
		iframe.remove();
	}
}