import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import * as opentype from 'opentype.js';
import { generateSVG, generateSVGWithPaths } from '../index';
import { detectWindowsArial } from './arialSignature';

type FontLike = Parameters<typeof generateSVGWithPaths>[0]['font'];
type ThemePreference = 'light' | 'dark' | 'system';

const storageKey = 'site-theme';
const themeTransitionLockClass = 'theme-transition-lock';

let clearThemeSwitchFrame = 0;
let clearThemeSwitchFrameNested = 0;

type StepSectionProps = {
	accentClassName: string;
	index: string;
	title: string;
	children: ReactNode;
};

function StepSection({ accentClassName, index, title, children }: StepSectionProps) {
	return (
		<section className="step-section" aria-labelledby={`step-${index}`}>
			<div className={`step-marker ${accentClassName}`}>{index}</div>
			<div>
				<h2 id={`step-${index}`}>{title}</h2>
				{children}
			</div>
		</section>
	);
}

function getStoredThemePreference(): ThemePreference {
	const stored = window.localStorage.getItem(storageKey);
	return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function getResolvedTheme(preference: ThemePreference) {
	if (preference === 'system') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	return preference;
}

function clearThemeSwitchingState() {
	if (clearThemeSwitchFrame) {
		window.cancelAnimationFrame(clearThemeSwitchFrame);
		clearThemeSwitchFrame = 0;
	}

	if (clearThemeSwitchFrameNested) {
		window.cancelAnimationFrame(clearThemeSwitchFrameNested);
		clearThemeSwitchFrameNested = 0;
	}

	document.documentElement.classList.remove(themeTransitionLockClass);
}

function beginThemeSwitchingState() {
	clearThemeSwitchingState();
	document.documentElement.classList.add(themeTransitionLockClass);
	clearThemeSwitchFrame = window.requestAnimationFrame(() => {
		clearThemeSwitchFrame = 0;
		clearThemeSwitchFrameNested = window.requestAnimationFrame(() => {
			clearThemeSwitchFrameNested = 0;
			document.documentElement.classList.remove(themeTransitionLockClass);
		});
	});
}

function applyThemePreference(preference: ThemePreference) {
	beginThemeSwitchingState();
	const resolved = getResolvedTheme(preference);
	document.documentElement.classList.toggle('dark', resolved === 'dark');
	document.documentElement.dataset.themePreference = preference;
	document.documentElement.dataset.themeResolved = resolved;
	document.documentElement.style.colorScheme = resolved;
	return resolved;
}

function isValidLineNumber(value: string) {
	if (!value) return false;
	const numericValue = Number.parseInt(value, 10);
	return numericValue >= 1 && numericValue <= 29;
}

function getFontDisplayName(font: FontLike) {
	const fullName = font.names.fullName;
	if (!fullName) {
		return '未知字体';
	}

	return fullName.en ?? Object.values(fullName)[0] ?? '未知字体';
}

function downloadSvg(filename: string, svgContent: string) {
	const blob = new Blob([svgContent], { type: 'image/svg+xml' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export function App() {
	const [lineNumber, setLineNumber] = useState('');
	const [hasArialFont, setHasArialFont] = useState(false);
	const [font, setFont] = useState<FontLike | null>(null);
	const [fontLoading, setFontLoading] = useState(false);
	const [fontLoadError, setFontLoadError] = useState('');
	const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => 'light');
	const fontBlobUrlRef = useRef<string | null>(null);
	const fontStyleElRef = useRef<HTMLStyleElement | null>(null);

	const validLineNumber = isValidLineNumber(lineNumber);
	const previewSvg = useMemo(() => {
		if (!validLineNumber) {
			return '';
		}

		return generateSVG(lineNumber);
	}, [lineNumber]);

	const lineHelpText = !lineNumber
		? '仅支持 1~29 号线。'
		: validLineNumber
			? `当前将生成 ${lineNumber} 号线方块。`
			: '线路号无效';

	const exportHelpText = !validLineNumber
		? '输入有效线路号后可导出。'
		: font
			? '两种导出方式均已可用。'
			: '路径版导出需要先在步骤 1 加载字体文件。';

	const fontMetaText = fontLoading
		? '正在加载字体文件'
		: fontLoadError
			? fontLoadError
			: font
				? `已加载：${getFontDisplayName(font)}`
				: '尚未加载字体文件';

	const fontHelpText = fontLoading
		? '正在解析字体并注入预览环境。'
		: fontLoadError
			? '请确认文件可被 opentype.js 解析。'
			: font
				? '路径版 SVG 现已可导出。'
				: '仅在需要导出字形路径版 SVG 时加载即可。';

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const storedPreference = getStoredThemePreference();
		let cancelled = false;
		setResolvedTheme(applyThemePreference(storedPreference));

		const handleThemeChange = () => {
			if (getStoredThemePreference() === 'system') {
				setResolvedTheme(applyThemePreference('system'));
			}
		};

		mediaQuery.addEventListener('change', handleThemeChange);

		void (async () => {
			const detected = await detectWindowsArial();
			if (!cancelled) {
				setHasArialFont(detected);
			}
		})();

		return () => {
			cancelled = true;
			mediaQuery.removeEventListener('change', handleThemeChange);
			clearThemeSwitchingState();
			if (fontBlobUrlRef.current) {
				URL.revokeObjectURL(fontBlobUrlRef.current);
			}
			if (fontStyleElRef.current) {
				fontStyleElRef.current.remove();
			}
		};
	}, []);

	async function handleFontFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		setFontLoading(true);
		setFontLoadError('');

		try {
			const buffer = await file.arrayBuffer();
			const parsedFont = opentype.parse(buffer) as FontLike;

			if (fontBlobUrlRef.current) {
				URL.revokeObjectURL(fontBlobUrlRef.current);
			}
			if (fontStyleElRef.current) {
				fontStyleElRef.current.remove();
			}

			const blob = new Blob([buffer], { type: file.type || 'font/ttf' });
			const fontBlobUrl = URL.createObjectURL(blob);
			const styleEl = document.createElement('style');
			styleEl.textContent = `@font-face { font-family: 'Arial'; src: url('${fontBlobUrl}'); font-display: swap; }`;
			document.head.append(styleEl);

			fontBlobUrlRef.current = fontBlobUrl;
			fontStyleElRef.current = styleEl;
			setFont(parsedFont);

			await document.fonts.load('12px Arial');
		} catch (error) {
			setFont(null);
			setFontLoadError(error instanceof Error ? `字体加载失败：${error.message}` : '字体加载失败。');
		} finally {
			setFontLoading(false);
		}
	}

	function handleThemeToggle() {
		const nextPreference = resolvedTheme === 'dark' ? 'light' : 'dark';
		window.localStorage.setItem(storageKey, nextPreference);
		setResolvedTheme(applyThemePreference(nextPreference));
	}

	function handleStandardDownload() {
		if (!validLineNumber) {
			return;
		}

		downloadSvg(`line-${lineNumber}.svg`, generateSVG(lineNumber));
	}

	function handlePathsDownload() {
		if (!validLineNumber || !font) {
			return;
		}

		const svgContent = generateSVGWithPaths({
			lineNumber,
			font
		});

		downloadSvg(`line-${lineNumber}-paths.svg`, svgContent);
	}

	return (
		<main className="page-shell">
			<article className="article-shell app-shell">
				<header className="page-header">
					<div className="page-meta-row">
						<p className="eyebrow">shmetro line id block generator</p>
						<button
							className="theme-toggle"
							type="button"
							onClick={handleThemeToggle}
							aria-label={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
						>
							{resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
						</button>
					</div>
					<h1>上海地铁线路号方块生成器</h1>
					<p className="lead">一个用于生成上海地铁风格线路号方块 SVG 图形的工具。</p>
					<div className="inline-links" aria-label="外部链接">
						<a href="https://github.com/Unnamed2964/kyuri-shmetro-line-id-block-generator" target="_blank" rel="noreferrer">GitHub 仓库</a>
						<a href="https://github.com/Unnamed2964" target="_blank" rel="noreferrer">GitHub 主页</a>
						<a href="https://umamichi.moe/" target="_blank" rel="noreferrer">作者博客</a>
					</div>
				</header>

				<StepSection index="1" accentClassName="line-2" title="字体文件">
					<p>预览时使用系统 Arial 字体。如需导出字形路径版 SVG（不依赖字体），请在此加载本地 Arial 字体文件，例如 <code>C:/Windows/Fonts/arial.ttf</code>。</p>
					<p className="status-line">
						<span className={`status-pill ${hasArialFont ? 'success' : 'warning'}`}>系统 Arial：{hasArialFont ? '已检测到' : '未检测到'}</span>
						<span className={`meta-note${fontLoadError ? ' is-error' : ''}`}>{fontMetaText}</span>
					</p>
					<label className="field-block" htmlFor="font-file-input">
						<span className="field-label">字体文件</span>
						<input id="font-file-input" className="text-input file-input" type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontFileChange} />
					</label>
					<p className={`help-text${fontLoadError ? ' is-error' : ''}`}>{fontHelpText}</p>
				</StepSection>

				<StepSection index="2" accentClassName="line-9" title="输入线路信息">
					<p>输入上海地铁线路号码（支持 1-18 号线及未来 19-23 号线）。</p>
					<label className="field-block" htmlFor="line-number-input">
						<span className="field-label">线路号码</span>
						<input
							id="line-number-input"
							className="text-input"
							type="text"
							inputMode="numeric"
							maxLength={2}
							placeholder="例如：2、10、16（仅支持 1~29）"
							value={lineNumber}
							onChange={(event) => setLineNumber(event.target.value.replace(/\D/g, '').slice(0, 2))}
							aria-invalid={lineNumber ? !validLineNumber : undefined}
						/>
					</label>
					<p className={`help-text${lineNumber && !validLineNumber ? ' is-error' : ''}`}>{lineHelpText}</p>
				</StepSection>

				<StepSection index="3" accentClassName="line-6" title="实时预览">
					<p>查看生成的线路标识效果，支持标准上海地铁配色方案。</p>
					<div className="preview-panel">
						<div className={`preview-canvas${previewSvg ? ' has-svg' : ''}`}>
							{previewSvg ? <div dangerouslySetInnerHTML={{ __html: previewSvg }} /> : '输入线路号码即可预览效果。'}
						</div>
						<dl className="preview-meta">
							<div>
								<dt>线路</dt>
								<dd>{validLineNumber ? `${lineNumber} 号线` : '未填写'}</dd>
							</div>
							<div>
								<dt>导出内容</dt>
								<dd>{font ? '标准 SVG / 字形路径版 SVG' : '标准 SVG'}</dd>
							</div>
						</dl>
					</div>
				</StepSection>

				<StepSection index="4" accentClassName="line-4" title="导出文件">
					<p><strong>标准 SVG</strong>：包含 <code>&lt;text&gt;</code> 元素，在安装了 Arial 字体的设备上可正常显示。</p>
					<p><strong>字形路径版</strong>：使用 opentype.js 将文字转为矢量路径，在任何设备均可正确显示，无需安装字体（需先在步骤 1 加载字体文件）。</p>
					<div className="actions">
						<button className="action-button primary" type="button" onClick={handleStandardDownload} disabled={!validLineNumber}>下载标准 SVG</button>
						<button className="action-button" type="button" onClick={handlePathsDownload} disabled={!validLineNumber || !font}>下载字形路径版 SVG</button>
					</div>
					<p className="help-text">{exportHelpText}</p>
				</StepSection>

				<section aria-labelledby="notes-title">
					<h2 id="notes-title">说明</h2>
					<p>本工具的设计参数（定位、字号等）均来自对实拍照片的粗略视觉估算，不代表上海申通地铁集团有限公司的任何企业视觉标准或官方规范。</p>
					<p>输出结果仅供个人学习、参考及非商业用途，请勿将其用于任何官方或商业场合。</p>
				</section>
			</article>
		</main>
	);
}