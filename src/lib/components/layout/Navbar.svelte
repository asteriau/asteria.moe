<script lang="ts">
  import LightRays from '$lib/components/layout/LightRays.svelte';
  import { onMount, afterUpdate } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let navContainer: HTMLElement | null = null;
  let navIndicator: HTMLDivElement | null = null;

  $: currentPath = $page.url.pathname;

  function navigate(event: Event, path: string) {
    event.preventDefault();
    goto(path);
  }

  function updateIndicatorPosition() {
    if (!navContainer || !navIndicator) return;

    const activeLink = navContainer.querySelector('.nav-link.active') as HTMLElement | null;
    if (!activeLink) return;

    const linkRect = activeLink.getBoundingClientRect();
    const containerRect = navContainer.getBoundingClientRect();
    const relativeLeft = linkRect.left - containerRect.left;

    navIndicator.style.width = `${linkRect.width}px`;
    navIndicator.style.left = `${relativeLeft}px`;
    navIndicator.style.bottom = '0';
  }

  onMount(() => {
    navIndicator = document.createElement('div');
    navIndicator.className = 'nav-indicator';
    navContainer?.appendChild(navIndicator);

    updateIndicatorPosition();
    window.addEventListener('resize', updateIndicatorPosition);

    return () => {
      window.removeEventListener('resize', updateIndicatorPosition);
      if (navIndicator && navIndicator.parentNode) {
        navIndicator.parentNode.removeChild(navIndicator);
      }
    };
  });

  afterUpdate(() => {
    updateIndicatorPosition();
  });
</script>

<LightRays />

<nav bind:this={navContainer} class="navbar">
  <div class="nav-container">
    <ul class="nav-menu">
      <li>
        <a
          href="/"
          class="nav-link"
          class:active={currentPath === '/'}
          on:click={(e) => navigate(e, '/')}
        >
          home
        </a>
      </li>
      <li>
        <a
          href="/about"
          class="nav-link"
          class:active={currentPath === '/about'}
          on:click={(e) => navigate(e, '/about')}
        >
          about
        </a>
      </li>
      <li>
        <a
          href="/projects"
          class="nav-link"
          class:active={currentPath === '/projects'}
          on:click={(e) => navigate(e, '/projects')}
        >
          projects
        </a>
      </li>
      <li>
        <a
          href="/contact"
          class="nav-link"
          class:active={currentPath === '/contact'}
          on:click={(e) => navigate(e, '/contact')}
        >
          contact
        </a>
      </li>
    </ul>
  </div>
</nav>
