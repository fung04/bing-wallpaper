<script lang="ts">
	import { Splide, SplideSlide, SplideTrack } from '@splidejs/svelte-splide';
	import '@splidejs/splide/dist/css/themes/splide-default.min.css';

	function generateRandomImage() {
		console.log(`https://picsum.photos/seed/${Math.random().toString(36).slice(2)}/1920/1080`);
		return `https://picsum.photos/seed/${Math.random().toString(36).slice(2)}/1920/1080`;
	}

	let slides = $state([generateRandomImage()]);

	function add() {
		slides = [...slides, generateRandomImage()];
	}

	function remove() {
		slides = slides.slice(0, -1);
	}

	let opt = {
		direction: 'ttb',
		height: '100vh',
		type: 'loop',
		autoplay: true,
		perPage: 1,
		pauseOnHover: false,
		pauseOnFocus: false,
		gap: '1rem'
	} as const;
</script>

<div id="bg-wrap">
	{#key slides}
		<Splide class="splide--dynamic" hasTrack={false} options={opt} aria-label="My Favorite Images">
			<SplideTrack>
				{#each slides as slide}
					<SplideSlide data-splide-interval="1000">
						<img src={slide} alt="" />
					</SplideSlide>
				{/each}
			</SplideTrack>
			<button class="splide__toggle" type="button">
				<span class="splide__toggle__play">Play</span>
				<span class="splide__toggle__pause">Pause</span>
			</button>
		</Splide>
	{/key}
	<div class="controls">
		<button onclick={add}>Add</button>
		<button onclick={remove}>Remove</button>
	</div>
</div>

<style>
	*,
	*::before,
	*::after {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(:root) {
		--gold: #c9a84c;
		--cream: #f5f0e8;
		--dark: #0a0a0a;
		--glass: rgba(10, 10, 10, 0.55);
		--glass-border: rgba(201, 168, 76, 0.25);
		--transition: 1.5s cubic-bezier(0.33, 1, 0.68, 1);
	}

	:global(html),
	:global(body) {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #0a0a0a;
		font-family: 'Geist Mono', monospace;
		color: var(--cream);
	}

	#bg-wrap {
		position: relative;
		width: 100vw;
		height: 100vh;
	}

	:global(#bg-wrap .splide),
	:global(#bg-wrap .splide__track),
	:global(#bg-wrap .splide__list),
	:global(#bg-wrap .splide__slide) {
		width: 100%;
		height: 100vh;
	}

	:global(#bg-wrap .splide__slide img) {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	:global(.splide .splide__toggle) {
		position: absolute;
		z-index: 10;
		bottom: 20px;
		right: 20px;
	}
	#bg-wrap > .controls {
		position: absolute;
		z-index: 10;
		bottom: 20px;
		left: 20px;
	}
</style>
