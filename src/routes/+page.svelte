<script lang="ts">
	import { appConfig } from '$lib/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';

	import type { AppConfig } from '$lib/types';
	import '../app.css';

	const COUNTRIES = [
		{ label: 'United States', code: 'US-en', display: 'US - English' },
		{ label: 'United Kingdom', code: 'GB-en', display: 'GB - English' },
		{ label: 'Canada (English)', code: 'CA-en', display: 'CA - English' },
		{ label: 'Canada (French)', code: 'CA-fr', display: 'CA - Français' },
		{ label: 'Germany', code: 'DE-de', display: 'DE - Deutsch' },
		{ label: 'France', code: 'FR-fr', display: 'FR - Français' },
		{ label: 'Italy', code: 'IT-it', display: 'IT - Italiano' },
		{ label: 'Spain', code: 'ES-es', display: 'ES - Español' },
		{ label: 'Brazil', code: 'BR-pt', display: 'BR - Português' },
		{ label: 'India', code: 'IN-en', display: 'IN - English' },
		{ label: 'Japan', code: 'JP-ja', display: 'JP - 日本語' },
		{ label: 'China', code: 'CN-zh', display: 'CN - 中文' },
		{ label: 'Rest of World', code: 'ROW-en', display: 'World - English' }
	];

	const RESOLUTION = [
		{ label: '4K UHD', code: '_UHD' },
		{ label: '1080p', code: '_1920x1080' },
		{ label: '480p', code: '_800x480' }
	];

	let intervalSec = $state(30);
	let totalImages = $state(30);
	let selectedCountries = $state<string[]>([]);
	let selectedResolution = $state('_1920x1080');

	onMount(() => {
		if (browser) {
			const stored = localStorage.getItem('appConfig');
			if (stored) {
				try {
					const config: AppConfig = JSON.parse(stored);
					selectedCountries = [...config.selectedCountries];
					selectedResolution = config.selectedResolution;
					intervalSec = config.intervalSec;
					totalImages = config.totalImages;
				} catch (e) {
					console.error('Failed to parse stored config', e);
				}
			}
		}
	});

	function handleCountryChange(country: string) {
		if (selectedCountries.includes(country)) {
			selectedCountries = selectedCountries.filter((t) => t !== country);
		} else {
			selectedCountries = [...selectedCountries, country];
		}
	}

	function handleResolutionChange(resolution: string) {
		selectedResolution = resolution;
	}

	function incrementInterval() {
		intervalSec += 1;
	}
	function decrementInterval() {
		if (intervalSec > 1) intervalSec -= 1;
	}
	function incrementTotalImages() {
		totalImages += 1;
	}
	function decrementTotalImages() {
		if (totalImages > 1) totalImages -= 1;
	}

	const allCountriesSelected = $derived(selectedCountries.length === COUNTRIES.length);

	function toggleAllCountries() {
		if (allCountriesSelected) {
			selectedCountries = [];
		} else {
			selectedCountries = COUNTRIES.map((c) => c.code);
		}
	}

	const selectedCountDisplay = $derived(
		selectedCountries.length > 0
			? `${selectedCountries.length} country${selectedCountries.length === 1 ? '' : 'ies'} selected`
			: 'No countries selected'
	);

	function handleSave() {
		if (selectedCountries.length === 0) {
			alert('Please select at least one country!');
			return;
		}

		appConfig.set({
			selectedCountries: [...selectedCountries],
			selectedResolution,
			intervalSec,
			totalImages
		});

		goto(resolve('/show'));
	}
</script>

<div class="p-4 flex min-h-screen w-full items-center justify-center bg-[#f8f7f4]">
	<div class="max-w-2xl animate-fade-in-up relative w-full">
		<div class="bg-white border-gray-100 shadow-lg rounded-2xl relative overflow-hidden border">
			<header class="px-6 py-4 text-white flex items-center justify-between bg-[#6366f1]">
				<div>
					<h1 class="text-xl font-bold tracking-tight">Bing Wallpaper</h1>
					<p class="text-indigo-100 text-sm mt-0.5">Daily inspiration, Playing automatically</p>
				</div>
			</header>

			<div class="p-8 space-y-6">
				<section>
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-xl font-semibold text-gray-800 gap-2 flex items-center">
							<span>🌍</span> Select Countries
						</h3>
						<button
							onclick={toggleAllCountries}
							class="text-sm px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors"
						>
							{#if allCountriesSelected}
								Deselect All
							{:else}
								Select All
							{/if}
						</button>
					</div>

					<div class="sm:grid-cols-3 gap-2 grid grid-cols-2">
						{#each COUNTRIES as country}
							<label class="group relative cursor-pointer">
								<input
									type="checkbox"
									name="country"
									value={country.code}
									checked={selectedCountries.includes(country.code)}
									onchange={() => handleCountryChange(country.code)}
									class="peer sr-only"
								/>
								<div
									class="p-2.5 bg-white border-gray-200 rounded-lg peer-checked:bg-indigo-50 hover:border-indigo-300 hover:shadow-md flex items-center justify-between border transition-all peer-checked:border-[#6366f1]"
								>
									<span class="text-sm font-medium text-gray-700 peer-checked:text-[#6366f1]"
										>{country.display}</span
									>
									<div
										class="w-4 h-4 rounded border-gray-300 bg-white flex items-center justify-center border-2 peer-checked:border-[#6366f1] peer-checked:bg-[#6366f1]"
									>
										<svg
											class="w-3 h-3 text-white pointer-events-none hidden"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="3"
												d="M5 13l4 4L19 7"
											></path></svg
										>
										<svg
											class="w-3 h-3 pointer-events-none text-[#6366f1] peer-checked:hidden"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											></path></svg
										>
									</div>
								</div>
							</label>
						{/each}
					</div>
					<p class="mt-2 text-sm text-gray-600 font-medium">{selectedCountDisplay}</p>
				</section>

				<div class="via-gray-300 h-px bg-gradient-to-r from-transparent to-transparent"></div>

				<section class="gap-6 md:grid-cols-2 grid">
					<div class="space-y-3">
						<h3 class="text-lg font-semibold text-gray-800 gap-2 flex items-center">
							<span>📊</span> Resolution
						</h3>
						<select
							class="p-2.5 bg-white border-gray-200 rounded-lg focus:ring-indigo-500/20 font-medium text-gray-700 w-full border transition-all outline-none focus:border-[#6366f1] focus:ring-4"
							value={selectedResolution}
							onchange={(e) => handleResolutionChange(e.currentTarget.value)}
						>
							{#each RESOLUTION as resolution}
								<option value={resolution.code}>{resolution.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-3">
						<h3 class="text-lg font-semibold text-gray-800 gap-2 flex items-center">
							<span>⏱️</span> Update Interval
						</h3>
						<div class="bg-white border-gray-200 rounded-lg p-1.5 flex items-center border">
							<button
								onclick={decrementInterval}
								class="w-9 h-9 text-lg font-bold hover:bg-indigo-100 rounded flex items-center justify-center text-[#6366f1] transition-colors"
							>
								−
							</button>
							<input
								type="number"
								min="1"
								max="3600"
								class="h-10 font-bold text-gray-800 text-base w-full border-none bg-transparent text-center outline-none"
								bind:value={intervalSec}
							/>
							<button
								onclick={incrementInterval}
								class="w-9 h-9 text-lg font-bold hover:bg-indigo-100 rounded flex items-center justify-center text-[#6366f1] transition-colors"
							>
								+
							</button>
						</div>
						<p class="text-xs text-gray-500 text-center">Seconds between wallpaper updates</p>
					</div>

					<div class="space-y-3">
						<h3 class="text-lg font-semibold text-gray-800 gap-2 flex items-center">
							<span>🖼️</span> Total Images
						</h3>
						<div class="bg-white border-gray-200 rounded-lg p-1.5 flex items-center border">
							<button
								onclick={decrementTotalImages}
								class="w-9 h-9 text-lg font-bold hover:bg-indigo-100 rounded flex items-center justify-center text-[#6366f1] transition-colors"
							>
								−
							</button>
							<input
								type='number'
								min="1"
								max="100"
								class="h-10 font-bold text-gray-800 text-base w-full border-none bg-transparent text-center outline-none"
								bind:value={totalImages}
							/>
							<button
								onclick={incrementTotalImages}
								onchange={incrementTotalImages}
								class="w-9 h-9 text-lg font-bold hover:bg-indigo-100 rounded flex items-center justify-center text-[#6366f1] transition-colors"
							>
								+
							</button>
						</div>
						<p class="text-xs text-gray-500 text-center">Number of images to fetch</p>
					</div>
				</section>

				<button
					onclick={handleSave}
					class="py-3 text-white font-semibold text-base rounded-lg shadow-md hover:shadow-lg mt-4 w-full bg-[#6366f1] transition-all hover:bg-[#5558f2]"
				>
					Start Playing 🚀
				</button>
			</div>

			<footer class="bg-gray-50 p-4 border-gray-100 border-t text-center">
				<p class="text-sm text-gray-600">Get stunning Bing wallpapers daily</p>
			</footer>
		</div>
	</div>
</div>

<style>
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in-up {
		animation: fadeInUp 0.6s ease-out forwards;
	}
</style>
