export const LINE_COLORS: Record<string, string> = {
    '1': '#E3002B',
    '2': '#8CC220', 
    '3': '#FCD600',
    '4': '#461D84',
    '5': '#944D9A',
    '6': '#D40068',
    '7': '#ED6F00',
    '8': '#0094D8',
    '9': '#87CAED',
    '10': '#C6AFD4',
    '11': '#871C2B',
    '12': '#007B61',
    '13': '#E999C0',
    '14': '#626020',
    '15': '#BCA886',
    '16': '#98D1C0',
    '17': '#BC796F',
    '18': '#C4984F',
    '19': '#F5AB78',
    '20': '#009F65',
    '21': '#F7AF00',
    '22': '#5F376F',
    '23': '#B0D478'
};

export const WHITE_TEXT_LINES = ['1', '4', '5', '6', '8', '11', '12', '14', '17', '20', '22'];

export interface LineTemplate {
    rect: { x: string; y: string; width: string; height: string };
    text: { x: string; y: string; fontSize: string; letterSpacing?: string; transform?: string };
}

export function getLineTemplate(lineNumber: string): LineTemplate {
    const lineNum = parseInt(lineNumber, 10);
    const templates: Record<string, LineTemplate> = {
        single_1: {
            rect: { x: "0", y: "0", width: "86", height: "100" },
            text: { x: "7.5", y: "88.8", fontSize: "104" }
        },
        single_4: {
            rect: { x: "0", y: "0", width: "86", height: "100" },
            text: { x: "14.9", y: "88.8", fontSize: "104" }
        },
        double_11: {
            rect: { x: "0", y: "0", width: "105", height: "100" },
            text: { x: "3.6", y: "88.6", fontSize: "104", letterSpacing: "-10.2" }
        },
        double_1x: {
            rect: { x: "0", y: "0", width: "105", height: "100" },
            text: { x: "-3.3", y: "88.6", fontSize: "104", letterSpacing: "-14" }
        },
        double_21: {
            rect: { x: "0", y: "0", width: "105", height: "100" },
            text: { x: "7.4", y: "88.6", fontSize: "104", letterSpacing: "-9.5" }
        },
        double_2x: {
            rect: { x: "0", y: "0", width: "105", height: "100" },
            text: { x: "0.7", y: "86.8", fontSize: "102", letterSpacing: "-5.2", transform: "scale(.98 1)" }
        }
    };
    if (lineNumber === '1') return templates.single_1;
    if (lineNum >= 2 && lineNum <= 9) return templates.single_4;
    if (lineNumber === '11') return templates.double_11;
    if (lineNum >= 10 && lineNum <= 19) return templates.double_1x;
    if (lineNumber === '21') return templates.double_21;
    if (lineNum >= 20 && lineNum <= 29) return templates.double_2x;
    return templates.double_1x;
}

export interface GenerateConfig {
    lineNumber: string | number;
    wrapper?: boolean; // Whether to wrap in an <svg> tag. Defaults to true.
}

/**
 * Parses and validates the line number, returning its numeric and string representation.
 */
function parseLineNumber(lineNumber: string | number) {
    const lineStr = String(lineNumber);
    if (!lineStr) return null;
    const lineNum = parseInt(lineStr, 10);
    if (isNaN(lineNum) || lineNum <= 0 || lineNum >= 30) {
        return null;
    }
    return { lineNum, lineStr };
}

/**
 * Retrieves the base properties representing the metro line sign:
 * Returns width, height, color, textColor, and the SVG inner group content.
 */
export function getSvgProperties(config: GenerateConfig | string | number) {
    const rawLineNumber = typeof config === 'object' ? config.lineNumber : config;
    const parsed = parseLineNumber(rawLineNumber);
    if (!parsed) return null;

    const { lineStr } = parsed;
    const color = LINE_COLORS[lineStr] || '#666666';
    const textColor = WHITE_TEXT_LINES.includes(lineStr) ? '#ffffff' : '#000000';
    const template = getLineTemplate(lineStr);
    const { width, height } = template.rect;
    const textDef = template.text;

    const letterSpacingAttr = textDef.letterSpacing ? ` letter-spacing="${textDef.letterSpacing}px"` : '';
    const transformAttr = textDef.transform ? ` transform="${textDef.transform}"` : '';

    const innerContent = `<g>
  <rect x="${template.rect.x}" y="${template.rect.y}" width="${template.rect.width}" height="${template.rect.height}" fill="${color}"/>
  <text x="${textDef.x}" y="${textDef.y}" fill="${textColor}" font-family="Arial" font-size="${textDef.fontSize}px"${letterSpacingAttr}${transformAttr}>${lineStr}</text>
</g>`;

    return {
        width,
        height,
        color,
        textColor,
        innerContent
    };
}

/**
 * Generates an SVG string containing the metro line block sign.
 * If config.wrapper is literally false (when an object is passed), only the <g> block is returned.
 * This satisfies the "可以嵌入任意svg的图案" (an SVG pattern pattern that can be embedded into any SVG) constraint.
 */
export function generateSVG(config: GenerateConfig | string | number): string {
    const isObject = typeof config === 'object' && config !== null;
    const wrapper = isObject ? (config as GenerateConfig).wrapper !== false : true;

    const props = getSvgProperties(config);
    if (!props) return '';

    if (!wrapper) {
        return props.innerContent;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${props.width}" height="${props.height}" viewBox="0 0 ${props.width} ${props.height}" xmlns="http://www.w3.org/2000/svg">
${props.innerContent.split('\n').map(line => ' ' + line).join('\n')}
</svg>`;
}

export interface FontPathConfig extends GenerateConfig {
    font: any; // An opentype.js font object
}

/**
 * Generates an SVG pattern using paths instead of raw text, removing dependency on the display font.
 * Powered by opentype.js
 */
export function generateSVGWithPaths(config: FontPathConfig): string {
    const parsed = parseLineNumber(config.lineNumber);
    if (!parsed || !config.font) return '';
    
    const { lineStr } = parsed;
    const color = LINE_COLORS[lineStr] || '#666666';
    const textColor = WHITE_TEXT_LINES.includes(lineStr) ? '#ffffff' : '#000000';
    const template = getLineTemplate(lineStr);
    const { width, height } = template.rect;
    const textDef = template.text;
    
    const pathOptions = textDef.letterSpacing ? { letterSpacing: parseFloat(textDef.letterSpacing) } : {};
    
    // Attempt to invoke opentype.js' getPath
    const path = config.font.getPath(
        lineStr, 
        parseFloat(textDef.x), 
        parseFloat(textDef.y), 
        parseFloat(textDef.fontSize), 
        pathOptions
    );
    const pathData = path.toPathData(4);
    const pathTransformAttr = textDef.transform ? ` transform="${textDef.transform}"` : '';

    const innerContent = `<g>
  <rect x="${template.rect.x}" y="${template.rect.y}" width="${template.rect.width}" height="${template.rect.height}" fill="${color}"/>
  <path d="${pathData}" fill="${textColor}"${pathTransformAttr}/>
</g>`;

    const wrapper = config.wrapper !== false;
    if (!wrapper) {
        return innerContent;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
${innerContent.split('\n').map(line => ' ' + line).join('\n')}
</svg>`;
}
