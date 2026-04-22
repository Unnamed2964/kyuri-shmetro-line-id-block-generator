const SIGNATURE_FONT_SIZE = 2048;
const SIGNATURE_GLYPHS = ['0', '1', '4', '8'] as const;
const WINDOWS_ARIAL_SIGNATURE = [1139, 1139, 1139, 1139] as const;
const SIGNATURE_TOLERANCE = 0.25;

function measureSignature(targetDocument: Document, fontFamily: string) {
	const canvas = targetDocument.createElement('canvas');
	const context = canvas.getContext('2d');

	if (!context) {
		return null;
	}

	context.font = `400 ${SIGNATURE_FONT_SIZE}px ${fontFamily}`;
	return SIGNATURE_GLYPHS.map((glyph) => context.measureText(glyph).width);
}

function matchesWindowsArialSignature(widths: readonly number[]) {
	return widths.every((width, index) => Math.abs(width - WINDOWS_ARIAL_SIGNATURE[index]) <= SIGNATURE_TOLERANCE);
}

async function detectWindowsArialInDocument(targetDocument: Document) {
	await targetDocument.fonts.ready;
	const widths = measureSignature(targetDocument, 'Arial');
	return widths ? matchesWindowsArialSignature(widths) : false;
}

export async function detectWindowsArial() {
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
		const frameDocument = iframe.contentDocument;
		if (!frameDocument) {
			return false;
		}

		return await detectWindowsArialInDocument(frameDocument);
	} finally {
		iframe.remove();
	}
}