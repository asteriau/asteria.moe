<script lang="ts">
  import { onMount } from "svelte";
  import languageColors from '$lib/colors.json';

  const REPOSITORIES = [
    "https://api.github.com/repos/asteriau/asteria.moe",
    "https://api.github.com/repos/asteriau/Whimsy",
    "https://api.github.com/repos/asteriau/dotfiles"
  ];

  interface Repository {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    language: string | null;
    owner: {
      login: string;
      avatar_url: string;
    };
  }

  let repositories: Repository[] = [];
  let isLoading = true;

  function getLanguageColor(language: string | null): string {
    if (!language) return "#ccc";
    return languageColors[language]?.color ?? "#ccc";
  }

  onMount(async () => {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    const headers: HeadersInit = {
      "Accept": "application/vnd.github.v3+json"
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const responses = await Promise.all(
        REPOSITORIES.map(url => 
          fetch(url, { headers })
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
              return res.json();
            })
            .catch(error => {
              console.error("Fetch error:", error);
              return null;
            })
        )
      );

      repositories = responses.filter((repo): repo is Repository => repo !== null);
    } catch (error) {
      console.error("Failed to load repositories:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

<section id="projects" class="section">
  <div class="section-content">
    <h2 class="section-title">projects</h2>
    <p class="hero-summary">here are some of the projects i've made or contributed to</p>

    {#if isLoading}
      <div class="loading">
        <div class="loading-spinner" />
        <p>loading projects...</p>
      </div>
    {:else if repositories.length === 0}
      <div class="empty">
        <p>no projects to display</p>
      </div>
    {:else}
      <div class="projects-grid">
        {#each repositories as repo (repo.id)}
          <a 
            href={repo.html_url} 
            target="_blank" 
            rel="noopener noreferrer"
            class="project-card"
            aria-label={`View ${repo.full_name} on GitHub`}
          >
            <span class="external-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
              </svg>
            </span>

            <div class="project-header">
              <img 
                src={`${repo.owner.avatar_url}?s=64`} 
                alt={repo.owner.login}
                class="avatar"
              />
              <div class="project-name">
                <span class="owner">{repo.owner.login}</span>
                <span class="separator">/</span>
                <span class="name">{repo.name}</span>
              </div>
            </div>

            <p class="project-description" title={repo.description || ''}>
              {repo.description || 'No description provided'}
            </p>

            <div class="project-stats">
              <div class="stars">
                <svg viewBox="0 -960 960 960" fill="currentColor">
                  <path d="m323-205 157-94 157 95-42-178 138-120-182-16-71-168-71 167-182 16 138 120-42 178ZM233-80l65-281L80-550l288-25 112-265 112 265 288 25-218 189 65 281-247-149L233-80Zm247-355Z"/>
                </svg>
                {repo.stargazers_count.toLocaleString()}
              </div>

              {#if repo.language}
                <div class="language" style="--lang-color: {getLanguageColor(repo.language)}">
                  <span class="language-dot" />
                  {repo.language}
                </div>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 40px;
    flex: 1 0 auto;
  }

  .section-content {
    text-align: center;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }

  .section-title {
    color: var(--main-accent);
    text-shadow: var(--text-shadow);
    font-weight: normal;
    font-size: var(--font-size-large);
    margin: 0 0 30px 0;
  }

  .hero-summary {
    font-size: var(--font-size-small);
    line-height: 1.6;
    margin: 0 0 40px 0;
    letter-spacing: 0.3px;
    color: var(--color-fg);
  }

  .loading,
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 60px 0;
    color: var(--color-fg);
    font-size: var(--font-size-small);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--main-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .projects-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 25px;
    width: 100%;
  }

  .project-card {
    display: block;
    position: relative;
    padding: 25px;
    border-radius: 5px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    text-decoration: none;
    color: var(--color-fg);
    transition: all var(--transition-duration) ease;
    box-shadow: var(--box-shadow);
    text-align: left;
    min-height: 180px;
  }

  .project-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37), 0 4px 8px rgba(0, 0, 0, 0.13);
    border-color: var(--main-accent);
  }

  .external-icon {
    position: absolute;
    right: 20px;
    top: 20px;
    opacity: 0.4;
    transition: opacity var(--transition-duration) ease;
  }

  .external-icon svg {
    width: 16px;
    height: 16px;
  }

  .project-card:hover .external-icon {
    opacity: 0.8;
  }

  .project-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
  }

  .project-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-small);
    min-width: 0;
  }

  .owner {
    color: var(--color-fg);
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .separator {
    color: var(--color-fg);
    opacity: 0.5;
  }

  .name {
    color: var(--main-accent);
    font-weight: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .project-description {
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 12px 0;
    color: var(--color-fg);
    opacity: 0.9;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: 12px;
  }

  .project-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: var(--main-accent);
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
  }

  .stars {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stars svg {
    width: 14px;
    height: 14px;
  }

  .language {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--main-accent);
  }

  .language-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: var(--lang-color);
    flex-shrink: 0;
  }

  @media (min-width: 769px) {
    .projects-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .section {
      padding: 40px 20px;
    }

    .section-content {
      max-width: 100%;
    }

    .section-title {
      font-size: 32px;
      margin-bottom: 20px;
    }

    .hero-summary {
      font-size: 15px;
      margin-bottom: 30px;
    }

    .projects-grid {
      gap: 20px;
    }

    .project-card {
      padding: 20px;
      min-height: 160px;
    }

    .project-header {
      margin-bottom: 12px;
    }

    .project-name {
      font-size: 15px;
    }

    .project-description {
      font-size: 13px;
      margin-bottom: 15px;
      min-height: 12px;
    }

    .project-stats {
      font-size: 12px;
      padding-top: 12px;
    }
  }

  @media (max-width: 480px) {
    .project-name {
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }

    .separator {
      display: none;
    }

    .owner,
    .name {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
    }
  }
</style>