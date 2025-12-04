<script lang="ts">
	import { onMount } from 'svelte';

	export interface Spotify {
		track_id: string;
		timestamps: { start: number; end: number };
		song: string;
		artist: string;
		album_art_url: string;
		album: string;
	}

	interface LyricLine {
		time: number;
		text: string;
	}

	export let discordId: string;

	// Discord state variables
	let discordActivity = '',
		discordDetails = '',
		discordState = '',
		discordImage = 'default.webp',
		discordSmallImage = '',
		discordIsActivity = false,
		discordElapsed = '',
		discordIsSpotifyActivity = false,

		// Spotify state variables
		spotifyActivity = '',
		spotifyDetails = '',
		spotifyState = '',
		spotifyImage = 'default.webp',
		spotifyIsPlaying = false,
		spotifySongLink = '',
		spotifyProgress = 0,
		lastPlayedSpotify: Spotify | null = null,

		// Lyrics state
		lyrics: LyricLine[] = [],
		currentLyricIndex = -1,
		fetchingLyrics = false,
		currentTrackId = '',

		// Shared state
		pulse = 30000,
		currentRAF: number,
		heartbeatInterval: ReturnType<typeof setInterval>,
		ws: WebSocket | null = null,
		user: { id: string; username: string; avatar: string; avatar_decoration: any; discriminator: string; global_name: string; public_flags: number } | null = null;

	// Helper functions
	function localTime() {
		return new Date().toLocaleTimeString('en-US', {
			timeZone: 'America/New_York',
			hour12: true,
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function parseLRC(lrcText: string): LyricLine[] {
		if (!lrcText) return [];

		const lines = lrcText.split('\n');
		const parsed: LyricLine[] = [];

		for (const line of lines) {
			const match = line.match(/\[(\d+):(\d+)\.(\d+)\](.*)/);
			if (match) {
				const minutes = parseInt(match[1]);
				const seconds = parseInt(match[2]);
				const centiseconds = parseInt(match[3]);
				const text = match[4].trim();

				const timeInMs = (minutes * 60 + seconds) * 1000 + centiseconds * 10;
				parsed.push({ time: timeInMs, text });
			}
		}

		return parsed.sort((a, b) => a.time - b.time);
	}

	async function fetchLyrics(artist: string, song: string, album: string, trackId: string) {
		if (fetchingLyrics || trackId === currentTrackId) return;

		fetchingLyrics = true;
		currentTrackId = trackId;
		lyrics = [];
		currentLyricIndex = -1;

		try {
			const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
			const apiUrl = `${supabaseUrl}/functions/v1/get-lyrics`;
			const params = new URLSearchParams({
				artist: artist.replace(/;/g, ','),
				song: song,
				album: album
			});

			const response = await fetch(`${apiUrl}?${params}`, {
				headers: {
					'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
				}
			});

			if (response.ok) {
				const data = await response.json();
				if (data.syncedLyrics) {
					lyrics = parseLRC(data.syncedLyrics);
				}
			}
		} catch (error) {
			console.error('Failed to fetch lyrics:', error);
		} finally {
			fetchingLyrics = false;
		}
	}

	function updateCurrentLyric(currentTimeMs: number) {
		if (lyrics.length === 0) return;

		let index = -1;
		for (let i = 0; i < lyrics.length; i++) {
			if (currentTimeMs >= lyrics[i].time) {
				index = i;
			} else {
				break;
			}
		}
		currentLyricIndex = index;
	}

	function musicProgress(spotify: Spotify) {
		const now = Date.now();
		const total = spotify.timestamps.end - spotify.timestamps.start;
		const current = now - spotify.timestamps.start;

		if (total > 0) {
			spotifyProgress = Math.min(100, Math.max(0, (current / total) * 100));
			updateCurrentLyric(current);
		}
	}

	function elapsedTime(timestampStart: number) {
		const elapsedMs = Date.now() - timestampStart;
		const hours = Math.floor(elapsedMs / 3600000);
		const minutes = Math.floor((elapsedMs % 3600000) / 60000);
		const seconds = Math.floor((elapsedMs % 60000) / 1000);

		if (hours > 0) {
			discordElapsed = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} elapsed`;
		} else {
			discordElapsed = `${minutes}:${seconds.toString().padStart(2, '0')} elapsed`;
		}
	}

	function formatLastPlayedTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days} day${days > 1 ? 's' : ''} ago`;
		} else if (hours > 0) {
			return `${hours} hour${hours > 1 ? 's' : ''} ago`;
		} else if (minutes > 0) {
			return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
		} else {
			return 'Just now';
		}
	}

	function cleanup() {
		if (currentRAF) {
			cancelAnimationFrame(currentRAF);
			currentRAF = undefined;
		}
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = undefined;
		}
		if (ws) {
			ws.close();
			ws = null;
		}
	}

	function handleDataUpdate(d: any) {
		console.log('Received data:', d);

		if (d.discord_user) {
			user = d.discord_user;
		}

		cleanup();

		spotifyIsPlaying = d.listening_to_spotify || false;

		if (spotifyIsPlaying && d.spotify) {
			const spotify: Spotify = d.spotify;
			spotifyActivity = spotify.song || '';
			const artistClean = spotify.artist ? spotify.artist.replace(/;/g, ',') : '';
			spotifyDetails = artistClean ? 'by ' + artistClean : '';
			spotifyState = spotify.album ? 'on ' + spotify.album : '';
			spotifyImage = spotify.album_art_url || 'default.webp';
			spotifySongLink = spotify.track_id ? `https://open.spotify.com/track/${spotify.track_id}` : '';

			lastPlayedSpotify = spotify;
			localStorage.setItem('lastPlayedSpotify', JSON.stringify({
				...spotify,
				last_played: Date.now()
			}));

			if (spotify.track_id && spotify.track_id !== currentTrackId) {
				fetchLyrics(artistClean, spotify.song, spotify.album || '', spotify.track_id);
			}

			function spotifyTick() {
				musicProgress(spotify);
				currentRAF = requestAnimationFrame(spotifyTick);
			}
			spotifyTick();
		}
		else if (lastPlayedSpotify) {
			spotifyIsPlaying = false;
			spotifyActivity = lastPlayedSpotify.song || '';
			spotifyDetails = lastPlayedSpotify.artist ? 'by ' + lastPlayedSpotify.artist.replace(/;/g, ',') : '';
			spotifyState = lastPlayedSpotify.album ? 'on ' + lastPlayedSpotify.album : '';
			spotifyImage = lastPlayedSpotify.album_art_url || 'default.webp';
			spotifySongLink = lastPlayedSpotify.track_id ? `https://open.spotify.com/track/${lastPlayedSpotify.track_id}` : '';
			spotifyProgress = 100;
			lyrics = [];
			currentLyricIndex = -1;
		}
		else {
			spotifyIsPlaying = false;
			spotifyActivity = 'Not Playing';
			spotifyDetails = 'No recent tracks';
			spotifyState = '';
			spotifyImage = 'default.webp';
			spotifySongLink = '';
			spotifyProgress = 0;
			lyrics = [];
			currentLyricIndex = -1;
		}

		discordIsActivity = false;
		discordIsSpotifyActivity = false;

		if (d.activities && d.activities.length > 0) {
			const activities = d.activities.filter((act: any) => {
				if (act.name === 'Spotify' || (act.application_id && act.application_id === 'spotify')) {
					discordIsSpotifyActivity = true;
					return false;
				}
				return act.type !== 4;
			});

			if (activities.length > 0) {
				discordIsActivity = true;
				const act = activities[0];

				discordActivity = act.name || '';
				discordDetails = act.details || '';
				discordState = act.state || '';

				if (act.assets && act.assets.large_image) {
					if (act.assets.large_image.startsWith('mp:')) {
						discordImage = `https://media.discordapp.net/${act.assets.large_image.replace('mp:', '')}`;
					} else if (act.application_id) {
						discordImage = `https://cdn.discordapp.com/app-assets/${act.application_id}/${act.assets.large_image}.webp?size=512`;
					}
				} else {
					discordImage = 'default.webp';
				}

				if (act.assets && act.assets.small_image && act.application_id) {
					discordSmallImage = `https://cdn.discordapp.com/app-assets/${act.application_id}/${act.assets.small_image}.webp?size=512`;
				} else {
					discordSmallImage = '';
				}

				if (act.timestamps && act.timestamps.start) {
					function discordTick() {
						elapsedTime(act.timestamps.start);
						currentRAF = requestAnimationFrame(discordTick);
					}
					discordTick();
				}
			} else {
				handleNoDiscordActivity(d);
			}
		}
		else {
			handleNoDiscordActivity(d);
		}
	}

	function handleNoDiscordActivity(d: any) {
		discordActivity = user ? `@${user.username}` : 'Discord';

		let status = d.discord_status || 'offline';
		if (status === 'dnd') {
			status = 'Do Not Disturb';
		} else {
			status = status.charAt(0).toUpperCase() + status.slice(1);
		}

		discordDetails = status;
		discordState = localTime();
		discordImage = 'default.webp';
		discordSmallImage = '';
		discordIsActivity = false;

		function timeTick() {
			discordState = localTime();
			currentRAF = requestAnimationFrame(timeTick);
		}
		timeTick();
	}

	onMount(() => {
		const savedLastPlayed = localStorage.getItem('lastPlayedSpotify');
		if (savedLastPlayed) {
			try {
				const parsed = JSON.parse(savedLastPlayed);
				lastPlayedSpotify = {
					track_id: parsed.track_id,
					timestamps: parsed.timestamps || { start: 0, end: 0 },
					song: parsed.song,
					artist: parsed.artist,
					album_art_url: parsed.album_art_url,
					album: parsed.album
				};
			} catch (e) {
				console.error('Failed to parse saved lastPlayedSpotify', e);
			}
		}

		function connect() {
			cleanup();

			ws = new WebSocket('wss://api.lanyard.rest/socket');

			ws.onopen = () => {
				console.log('Connected to Lanyard');
			};

			ws.onmessage = (e) => {
				try {
					const json = JSON.parse(e.data);
					const { op, d } = json;

					if (op === 1) {
						pulse = d.heartbeat_interval;
						ws?.send(JSON.stringify({
							op: 2,
							d: { subscribe_to_id: discordId }
						}));

						if (heartbeatInterval) clearInterval(heartbeatInterval);
						heartbeatInterval = setInterval(
							() => ws?.send(JSON.stringify({ op: 3 })),
							pulse
						);
					}

					if (op === 0) {
						handleDataUpdate(d);
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.onclose = (e) => {
				console.log('Disconnected, reconnecting...', e.code);
				setTimeout(connect, 2500);
			};

			ws.onerror = (error) => {
				console.error('WebSocket error:', error);
			};
		}

		if (discordId) {
			connect();
		} else {
			console.error('No discordId provided');
		}

		return cleanup;
	});

	$: avatarURL = (() => {
		if (!user) return '';

		if (user.avatar) {
			const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
			return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=128`;
		} else {
			const defaultAvatarIndex = user.discriminator
				? Number(user.discriminator) % 5
				: (BigInt(user.id) >> 22n) % 6n;
			return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png?size=128`;
		}
	})();
</script>

<div class="rpc-container">

	<div class="rpc-grid">
		<div class="rpc-box">
			<div class="rpc-main">
				<div class="rpc-images">
					{#if discordImage}
						<img
							src={discordImage}
							alt={discordActivity}
							class="big"
							style="border-radius: {discordIsActivity ? '12px' : '50%'};"
							on:error={(e) => {
								const target = e.target as HTMLImageElement;
								target.src = 'default.webp';
							}}
						/>
					{/if}

					{#if discordSmallImage}
						<img
							src={discordSmallImage}
							alt="Small icon"
							class="small"
							on:error={(e) => {
								const target = e.target as HTMLImageElement;
								target.style.display = 'none';
							}}
						/>
					{/if}
				</div>

				<div class="rpc-text">
					<h3>{discordActivity || 'No Activity'}</h3>

					{#if discordDetails}
						<h5 class="details">{discordDetails}</h5>
					{/if}

					{#if discordState}
						<h5 class="state">{discordState}</h5>
					{/if}

					{#if discordIsActivity && discordElapsed}
						<h5 class="elapsed">{discordElapsed}</h5>
					{/if}
				</div>
			</div>
		</div>

		<div class="rpc-box spotify-box">
			<div class="spotify-scrollable">
				<div class="rpc-main">
					<div class="rpc-images">
						{#if spotifyImage}
							<img
								src={spotifyImage}
								alt={spotifyActivity}
								class="big {spotifyIsPlaying ? 'spin' : ''}"
								style="border-radius: 50%;"
								on:error={(e) => {
									const target = e.target as HTMLImageElement;
									target.src = 'default.webp';
								}}
							/>
						{/if}
					</div>

					<div class="rpc-text">
						{#if spotifyIsPlaying && spotifySongLink}
							<a href={spotifySongLink} target="_blank" rel="noreferrer" class="song-link">
								<h3>{spotifyActivity || 'Unknown Song'}</h3>
							</a>
						{:else if spotifyActivity === 'Not Playing'}
							<h3>Not Playing</h3>
						{:else}
							<h3 class="last-played">
								{spotifyActivity || 'Unknown Song'}
								{#if lastPlayedSpotify}
									<span class="last-played-time">({formatLastPlayedTime(JSON.parse(localStorage.getItem('lastPlayedSpotify') || '{"last_played":0}').last_played || Date.now())})</span>
								{/if}
							</h3>
						{/if}

						{#if spotifyDetails}
							<h5 class="details">{spotifyDetails}</h5>
						{/if}

						{#if spotifyState}
							<h5 class="state">{spotifyState}</h5>
						{/if}

						{#if spotifyProgress > 0}
							<div class="progress-container">
								<progress
									max="100"
									value={spotifyProgress}
									class={spotifyIsPlaying ? 'playing' : 'last-played'}
								/>
								{#if !spotifyIsPlaying && lastPlayedSpotify}
									<p class="last-played-label">Last Played</p>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				{#if lyrics.length > 0 && spotifyIsPlaying}
					<div class="lyrics-section">
						<div class="lyrics-divider"></div>
						{#each lyrics as lyric, index}
							<p
								class="lyric-line"
								class:current={index === currentLyricIndex}
								class:past={index < currentLyricIndex}
							>
								{lyric.text || '♪'}
							</p>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.rpc-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.rpc-user {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;

		.rpc-avatar {
			height: 40px;
			width: 40px;
			border-radius: 50%;
			object-fit: cover;
			border: 2px solid rgba(255, 255, 255, 0.1);
		}

		.rpc-username {
			margin: 0;
			font-size: 0.9rem;
			opacity: 0.8;
		}
	}

	.rpc-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		width: 100%;
	}

	.rpc-box {
		background: rgba(25, 25, 25, 1);
		border-radius: 12px;
		padding: 1rem;

		&.spotify-box {
			max-height: 400px;
			overflow: hidden;
			padding: 0;
		}
	}

	.spotify-scrollable {
		max-height: 400px;
		overflow-y: auto;
		padding: 1rem;
		scroll-behavior: smooth;

		&::-webkit-scrollbar {
			width: 8px;
		}

		&::-webkit-scrollbar-track {
			background: rgba(255, 255, 255, 0.05);
			border-radius: 4px;
		}

		&::-webkit-scrollbar-thumb {
			background: rgba(141, 163, 185, 0.3);
			border-radius: 4px;

			&:hover {
				background: rgba(141, 163, 185, 0.5);
			}
		}
	}

	.lyrics-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
	}

	.lyrics-divider {
		width: 100%;
		height: 1px;
		background: linear-gradient(to right, transparent, rgba(141, 163, 185, 0.3), transparent);
		margin-bottom: 1.5rem;
	}

	.lyric-line {
		margin: 0.75rem 0;
		font-size: 1rem;
		line-height: 1.6;
		opacity: 0.4;
		transition: all 0.3s ease;
		text-align: center;

		&.past {
			opacity: 0.3;
		}

		&.current {
			opacity: 1;
			color: #8DA3B9;
			font-weight: 500;
			font-size: 1.1rem;
			text-shadow: 0 0 8px rgba(141, 163, 185, 0.3);
			transform: scale(1.05);
		}
	}

	.rpc-main {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.rpc-images {
		position: relative;
		flex-shrink: 0;
	}

	.big {
		height: 100px;
		width: 100px;
		object-fit: cover;
		user-select: none;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

		&.spin {
			animation: rotate 20s linear infinite;
		}
	}

	.small {
		height: 32px;
		width: 32px;
		border-radius: 50%;
		position: absolute;
		bottom: -8px;
		right: -8px;
		object-fit: cover;
		background-color: var(--bg-color, #1e1e1e);
		border: 3px solid var(--bg-color, #1e1e1e);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.rpc-text {
		flex: 1;
		min-width: 0;

		h3 {
			margin: 0 0 0.5rem 0;
			font-size: 1.2rem;
			font-weight: 600;
			line-height: 1.3;

			&.last-played {
				opacity: 0.8;

				.last-played-time {
					font-size: 0.85rem;
					font-weight: 400;
					opacity: 0.7;
					margin-left: 0.5rem;
				}
			}
		}

		h5 {
			margin: 0.25rem 0;
			font-size: 0.9rem;
			font-weight: 400;
			opacity: 0.8;
			line-height: 1.4;

			&.details {
				font-weight: 500;
			}

			&.state, &.elapsed {
				font-size: 0.85rem;
				opacity: 0.7;
			}
		}

		.progress-container {
			margin-top: 0.5rem;

			.last-played-label {
				margin: 0.25rem 0 0 0;
				font-size: 0.8rem;
				font-weight: 400;
				opacity: 0.6;
				text-align: center;
			}
		}

		progress {
			width: 100%;
			border-radius: 10rem;
			height: 6px;
			background-color: rgba(255, 255, 255, 0.1);
			border: none;
			overflow: hidden;

			&::-webkit-progress-bar {
				background-color: rgba(255, 255, 255, 0.1);
				border-radius: 10rem;
			}

			&.playing {
				&::-webkit-progress-value {
					background-color: #8C977D;
					border-radius: 10rem;
					transition: width 0.3s ease;
				}

				&::-moz-progress-bar {
					background-color: #8C977D;
					border-radius: 10rem;
				}
			}

			&.last-played {
				&::-webkit-progress-value {
					background-color: #252525;
					border-radius: 10rem;
				}

				&::-moz-progress-bar {
					background-color: #252525;
					border-radius: 10rem;
				}
			}
		}
	}

	.song-link {
		text-decoration: none;
		color: inherit;

		&:hover {
			text-decoration: underline;
			opacity: 0.9;
		}

		h3 {
			color: inherit;
			margin: 0;
		}
	}

	@keyframes rotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@media (max-width: 768px) {
		.rpc-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.rpc-main {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.big {
			height: 80px;
			width: 80px;
		}

		.small {
			height: 28px;
			width: 28px;
		}

		.rpc-text {
			width: 100%;
		}
	}
</style>
