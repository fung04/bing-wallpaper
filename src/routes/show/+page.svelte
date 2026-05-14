<script lang="ts">
	import { appConfig } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount, onDestroy, tick } from 'svelte';

	const BASE = 'https://bing.npanuhin.me';

	// --- State Management ---
	let showLoader = $state(true);
	let showUI = $state(false);
	let showError = $state(false);
	let isTransitioning = $state(false);

	let data: Record<number, any[]> = $state({});
	let globalState: Record<number, number> = $state({});
	let currentCountryIndex = $state(0);

	// Background layers
	let bgA = $state('');
	let bgB = $state('');
	let activeLayer = $state<'a' | 'b'>('a');

	// Text Panel Data (Snapshots to prevent text/image desync)
	let panel1Data = $state<any>(null);
	let panel2Data = $state<any>(null);
	let activePanel = $state<'1' | '2'>('1');

	// Timer logic
	let progressPct = $state(0);
	let timerCount = $state(0);
	let intervalSec = $state(30);
	let slideshowInterval: ReturnType<typeof setInterval> | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	let todayStr = $state('');
	let countryLabel = $state('');
	let dropdownOpen = $state(false);

	// --- Lifecycle ---
	onMount(async () => {
		if (!$appConfig) {
			goto(resolve('/'));
			return;
		}
		intervalSec = Number($appConfig.intervalSec) || 30;
		timerCount = intervalSec;
		todayStr = new Date().toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});

		await loadImages();

		if (Object.keys(data).length === 0) {
			showLoader = false;
			showError = true;
			return;
		}

		for (let i = 0; i < $appConfig.selectedCountries.length; i++) {
			globalState[i] = 0;
		}

		// Initial state setup
		panel1Data = data[currentCountryIndex]?.[0];
		bgA = `url("${getImageUrl(panel1Data)}")`;
		updateCountryLabel();

		startSlideshow();
	});

	onDestroy(() => stopSlideshow());

	// --- Data Loading ---
	async function loadImages() {
		try {
			const selectedCountries = [...$appConfig.selectedCountries];
			const now: Date = new Date();
			const year: number = now.getFullYear();
			const startOfYear: Date = new Date(year, 0, 1);
			const diffInDays: number = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
			let requiredYear: number = 1;
			const totalImages = ($appConfig.totalImages as number);
			
			if (diffInDays != totalImages) {
				if (diffInDays > 365){
					requiredYear = Math.floor(diffInDays / 365);
				}
				else {
					requiredYear = 2
				}
			}

			for (let i = 0; i < selectedCountries.length; i++) {
				const [countryName, lang] = selectedCountries[i].split('-');
				let jsonData: any[] = [];

				for (let y = 0; y < requiredYear; y++) {
					const res = await fetch(`${BASE}/${countryName}-${lang}.${year - y}.min.json`);
					if (res.ok) {
						const chunk = await res.json();
						jsonData = jsonData.concat(chunk.reverse());
					}
				}
				data[i] = jsonData.slice(0, totalImages);
			}
		} catch (err) {
			showError = true;
		}
	}

	// --- Image Helpers ---
	function getImageUrl(item: any): string {
		if (!item) return '';
		const base = item.bing_url ?? item.url ?? '';
		const resolution = $appConfig.selectedResolution;
		return base.startsWith('http') ? base.replace('_UHD', resolution) : base;
	}

	function preloadImage(url: string): Promise<void> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve();
			img.onerror = () => resolve();
			img.src = url;
		});
	}

	async function setBackground() {
		if (isTransitioning) return;
		isTransitioning = true;

		const idx = globalState[currentCountryIndex] ?? 0;
		const item = data[currentCountryIndex]?.[idx];
		if (!item) {
			isTransitioning = false;
			return;
		}

		const url = getImageUrl(item);
		await preloadImage(url);

		if (activeLayer === 'a') {
			bgB = `url("${url}")`;
			panel2Data = item;
		} else {
			bgA = `url("${url}")`;
			panel1Data = item;
		}

		await tick();
		activeLayer = activeLayer === 'a' ? 'b' : 'a';
		activePanel = activePanel === '1' ? '2' : '1';

		setTimeout(() => {
			isTransitioning = false;
			preloadNext();
		}, 1200);
	}

	function preloadNext() {
		const nextIdx = (globalState[currentCountryIndex] ?? 0) + 1;
		const item = data[currentCountryIndex]?.[nextIdx];
		if (item) new Image().src = getImageUrl(item);
	}

	// --- Slideshow ---
	function startSlideshow() {
		stopSlideshow();
		progressPct = 0;
		timerCount = intervalSec;
		showUI = true;
		showLoader = false;

		timerInterval = setInterval(() => {
			if (timerCount > 0) {
				timerCount--;
				progressPct = ((intervalSec - timerCount) / intervalSec) * 100;
			}
		}, 1000);

		slideshowInterval = setInterval(() => advanceSlide(), intervalSec * 1000);
	}

	function stopSlideshow() {
		if (slideshowInterval) clearInterval(slideshowInterval);
		if (timerInterval) clearInterval(timerInterval);
		slideshowInterval = null;
		timerInterval = null;
	}

	function advanceSlide() {
		const total = data[currentCountryIndex]?.length ?? 0;
		if (total === 0 || isTransitioning) return;
		globalState[currentCountryIndex] = (globalState[currentCountryIndex] + 1) % total;
		setBackground();
		timerCount = intervalSec;
	}

	function prevSlide() {
		const total = data[currentCountryIndex]?.length ?? 0;
		if (total === 0 || isTransitioning) return;
		globalState[currentCountryIndex] = (globalState[currentCountryIndex] - 1 + total) % total;
		setBackground();
		startSlideshow();
	}

	function nextSlide() {
		if (isTransitioning) return;
		advanceSlide();
		startSlideshow();
	}

	// --- Country Selector ---
	function selectCountry(index: number) {
		if (isTransitioning) return;
		currentCountryIndex = index;
		updateCountryLabel();
		setBackground();
		startSlideshow();
		dropdownOpen = false;
	}

	function updateCountryLabel() {
		const c = $appConfig.selectedCountries[currentCountryIndex];
		if (!c) return;
		const [region, lang] = c.split('-');
		countryLabel = `${region.toUpperCase()} — ${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
	}

	function countryDisplayName(c: string): string {
		const [region, lang] = c.split('-');
		return `${region.toUpperCase()} — ${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
	}

	// --- Tab Visibility ---
	function handleVisibilityChange() {
		if (document.hidden) {
			stopSlideshow();
		} else {
			currentCountryIndex = (currentCountryIndex + 1) % $appConfig.selectedCountries.length;
			updateCountryLabel();
			setBackground();
			startSlideshow();
		}
	}
</script>

<svelte:document
	on:visibilitychange={handleVisibilityChange}
	on:click={(e) => {
		if (!(e.target as HTMLElement).closest('#country-wrap')) dropdownOpen = false;
	}}
/>

<!-- Loader -->
{#if showLoader}
	<div id="loader">
		<div class="loader-ring"></div>
		<div class="loader-text">Loading wallpaper</div>
	</div>
{/if}

<!-- Background -->
<div id="bg-wrap">
	<div class="bg-img" class:visible={activeLayer === 'a'} style:background-image={bgA}></div>
	<div class="bg-img" class:visible={activeLayer === 'b'} style:background-image={bgB}></div>
	<div id="bg-overlay"></div>
</div>

<!-- Error -->
{#if showError}
	<div id="error-msg" class="visible">
		<div class="err-icon">◌</div>
		<div class="err-title">No Wallpaper Found</div>
		<div class="err-text">Could not retrieve images for this region. Try a different country.</div>
	</div>
{/if}

<!-- UI -->
{#if showUI}
	<div id="ui" class:visible={showUI}>
		<!-- Top bar -->
		<div id="topbar">
			<div id="country-wrap">
				<button
					id="country-btn"
					class:open={dropdownOpen}
					onclick={() => (dropdownOpen = !dropdownOpen)}
				>
					<span id="country-label">{countryLabel}</span>
					<svg width="12" height="8" viewBox="0 0 12 8" fill="none">
						<path
							d="M1 1l5 5 5-5"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
				</button>

				<div id="country-dropdown" class:open={dropdownOpen}>
					{#each $appConfig.selectedCountries as string[] as country, i}
						<button
							class="dropdown-item"
							class:active={i === currentCountryIndex}
							onclick={() => selectCountry(i)}
						>
							<span>{countryDisplayName(country)}</span>
							<span class="locale-code">{country}</span>
						</button>
					{/each}
					<button class="dropdown-item" onclick={() => goto(resolve('/'))}>Edit</button>
				</div>
			</div>

			<div id="today-date">
				<div class="day-label">Today</div>
				<div class="day-value">{todayStr}</div>
			</div>
		</div>

		<!-- Bottom info -->
		<div id="bottom">
			<div class="info-panel" class:visible={activePanel === '1'}>
				<div class="title-line"></div>
				<div class="img-title">{panel1Data?.title || ''}</div>
				<div class="img-caption">{panel1Data?.caption || ''}</div>
				<div class="img-description">{panel1Data?.description || ''}</div>
				<div class="img-meta">
					<div class="img-date-badge">{panel1Data?.date || ''}</div>
					<div class="img-copyright">{panel1Data?.copyright || ''}</div>
				</div>
			</div>

			<div class="info-panel" class:visible={activePanel === '2'}>
				<div class="title-line"></div>
				<div class="img-title">{panel2Data?.title || ''}</div>
				<div class="img-caption">{panel2Data?.caption || ''}</div>
				<div class="img-description">{panel2Data?.description || ''}</div>
				<div class="img-meta">
					<div class="img-date-badge">{panel2Data?.date || ''}</div>
					<div class="img-copyright">{panel2Data?.copyright || ''}</div>
				</div>
			</div>

			<div id="right-controls">
				<div id="timer-wrap">
					<div id="timer-label">Next in</div>
					<div id="progress-track">
						<div id="progress-fill" style:width="{progressPct}%"></div>
					</div>
					<div id="timer-count">{timerCount}s</div>
				</div>

				<div id="img-counter">
					<span id="cur-idx">{(globalState[currentCountryIndex] ?? 0) + 1}</span>
					/
					{data[currentCountryIndex]?.length || 0}
				</div>

				<div id="nav-btns">
					<button class="nav-btn" onclick={prevSlide} disabled={isTransitioning}>‹</button>
					<button class="nav-btn" onclick={nextSlide} disabled={isTransitioning}>›</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	*,
	*::before,
	*::after {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:root {
		--gold: #c9a84c;
		--cream: #f5f0e8;
		--dark: #0a0a0a;
		--glass: rgba(10, 10, 10, 0.55);
		--glass-border: rgba(201, 168, 76, 0.25);
		--transition: 1.5s cubic-bezier(0.33, 1, 0.68, 1);
	}

	html,
	body {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #0a0a0a;
		font-family: 'Geist Mono', monospace;
		color: var(--cream);
	}

	/* ── Background ── */
	#bg-wrap {
		position: fixed;
		inset: 0;
		z-index: 0;
		background: var(--dark);
	}

	.bg-img {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		opacity: 0;
		transition: opacity var(--transition);
	}

	.bg-img.visible {
		opacity: 1;
	}

	#bg-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.82) 0%,
			rgba(0, 0, 0, 0.35) 40%,
			rgba(0, 0, 0, 0.12) 70%,
			rgba(0, 0, 0, 0.08) 100%
		);
		z-index: 1;
	}

	/* ── Loader ── */
	#loader {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--dark);
	}

	.loader-ring {
		width: 48px;
		height: 48px;
		border: 2px solid rgba(201, 168, 76, 0.2);
		border-top-color: var(--gold);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 18px;
	}

	.loader-text {
		font-size: 11px;
		letter-spacing: 0.2em;
		color: rgba(201, 168, 76, 0.6);
		text-transform: uppercase;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── UI Shell ── */
	#ui {
		position: fixed;
		inset: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 28px 36px 36px;
		opacity: 0;
		transition: opacity 0.8s ease;
		pointer-events: none;
	}

	#ui.visible {
		opacity: 1;
		pointer-events: all;
	}

	/* ── Top bar ── */
	#topbar {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
	}

	#country-wrap {
		position: relative;
	}

	#country-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--glass);
		border: 1px solid var(--glass-border);
		backdrop-filter: blur(18px);
		color: var(--cream);
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		padding: 10px 16px;
		cursor: pointer;
		border-radius: 3px;
		transition:
			border-color 0.3s,
			background 0.3s;
	}

	#country-btn:hover {
		border-color: var(--gold);
		background: rgba(10, 10, 10, 0.75);
	}

	#country-btn svg {
		opacity: 0.6;
		transition: transform 0.3s;
	}

	#country-btn.open svg {
		transform: rotate(180deg);
	}

	#country-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		min-width: 220px;
		background: rgba(8, 8, 8, 0.92);
		border: 1px solid var(--glass-border);
		backdrop-filter: blur(24px);
		border-radius: 3px;
		overflow: hidden;
		display: none;
		z-index: 50;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
	}

	#country-dropdown.open {
		display: block;
		animation: dropIn 0.25s ease;
	}

	@keyframes dropIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-item {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 11px 16px;
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
		color: rgba(245, 240, 232, 0.7);
		background: none;
		border: none;
		font-family: 'Geist Mono', monospace;
		gap: 16px;
		transition:
			background 0.2s,
			color 0.2s;
	}

	.dropdown-item:hover {
		background: rgba(201, 168, 76, 0.1);
		color: var(--cream);
	}

	.dropdown-item.active {
		color: var(--gold);
	}

	.locale-code {
		font-size: 10px;
		color: rgba(201, 168, 76, 0.5);
	}

	/* ── Date ── */
	#today-date {
		text-align: right;
	}

	.day-label {
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(245, 240, 232, 0.4);
		margin-bottom: 4px;
	}

	.day-value {
		font-family: 'Playfair Display', serif;
		font-size: clamp(15px, 2vw, 22px);
		font-weight: 400;
		line-height: 1.1;
		color: var(--cream);
	}

	/* ── Bottom ── */
	#bottom {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		position: relative;
		height: 350px;
	}

	/* Panels: stacked absolutely so crossfade works without layout shift */
	.info-panel {
		position: absolute;
		bottom: 0;
		left: 0;
		max-width: 900px;
		opacity: 0;
		pointer-events: none;
		transform: translateY(20px);
		transition:
			opacity 1s ease,
			transform 1s ease;
	}

	.info-panel.visible {
		opacity: 1;
		pointer-events: all;
		transform: translateY(0);
	}

	.title-line {
		width: 40px;
		height: 1px;
		background: var(--gold);
		margin-bottom: 12px;
		opacity: 0.6;
	}

	.img-title {
		font-family: 'Playfair Display', serif;
		font-size: clamp(24px, 4.5vw, 56px);
		font-weight: 700;
		line-height: 1.05;
		color: var(--cream);
		text-shadow: 0 2px 24px rgba(0, 0, 0, 0.7);
		margin-bottom: 10px;
	}

	.img-caption {
		font-size: 12px;
		letter-spacing: 0.1em;
		color: rgba(245, 240, 232, 0.65);
		margin-bottom: 8px;
		line-height: 1.6;
	}

	.img-description {
		font-size: 12px;
		letter-spacing: 0.05em;
		color: rgba(245, 240, 232, 0.5);
		line-height: 1.7;
		max-width: 580px;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 10;
		overflow: hidden;
	}

	.img-meta {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 14px;
	}

	.img-date-badge {
		font-size: 10px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--gold);
		border: 1px solid rgba(201, 168, 76, 0.35);
		padding: 5px 10px;
		border-radius: 2px;
		background: rgba(201, 168, 76, 0.06);
		backdrop-filter: blur(8px);
	}

	.img-copyright {
		font-size: 10px;
		letter-spacing: 0.1em;
		color: rgba(245, 240, 232, 0.3);
	}

	/* ── Right controls ── */
	#right-controls {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 16px;
		/* Keeps it anchored to bottom-right while panels are absolute */
		position: relative;
		margin-left: auto;
	}

	#timer-wrap {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
	}

	#timer-label {
		font-size: 10px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgba(201, 168, 76, 0.5);
	}

	#progress-track {
		width: 120px;
		height: 2px;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 1px;
		overflow: hidden;
	}

	#progress-fill {
		height: 100%;
		background: var(--gold);
		border-radius: 1px;
		transition: width 1s linear;
		width: 0%;
	}

	#timer-count {
		font-size: 10px;
		letter-spacing: 0.15em;
		color: rgba(201, 168, 76, 0.45);
	}

	#img-counter {
		font-size: 11px;
		letter-spacing: 0.18em;
		color: rgba(245, 240, 232, 0.35);
	}

	#cur-idx {
		color: var(--cream);
	}

	#nav-btns {
		display: flex;
		gap: 10px;
	}

	.nav-btn {
		width: 40px;
		height: 40px;
		background: var(--glass);
		border: 1px solid var(--glass-border);
		backdrop-filter: blur(14px);
		color: var(--cream);
		cursor: pointer;
		border-radius: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		transition:
			border-color 0.25s,
			background 0.25s,
			transform 0.15s;
	}

	.nav-btn:hover:not(:disabled) {
		border-color: var(--gold);
		background: rgba(201, 168, 76, 0.1);
		transform: scale(1.05);
	}

	.nav-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	/* ── Error ── */
	#error-msg {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: none;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.9);
	}

	#error-msg.visible {
		display: flex;
		animation: fadeIn 0.4s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.err-icon {
		font-size: 40px;
		margin-bottom: 20px;
		opacity: 0.5;
	}

	.err-title {
		font-family: 'Playfair Display', serif;
		font-size: 24px;
		margin-bottom: 10px;
	}

	.err-text {
		font-size: 12px;
		letter-spacing: 0.1em;
		color: rgba(245, 240, 232, 0.4);
		text-align: center;
		max-width: 320px;
	}

	/* ── Responsive ── */
	@media (max-width: 600px) {
		#ui {
			padding: 18px 20px 24px;
		}

		.img-description,
		#right-controls {
			display: none;
		}

		#topbar {
			flex-direction: column;
		}

		#today-date {
			text-align: left;
		}
	}
</style>
