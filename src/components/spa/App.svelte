<script lang="ts">
  import { writable } from 'svelte/store';
  import { fade } from 'svelte/transition';
  import Navbar from '../Navbar.svelte';
  import Home from '../sections/Home.svelte';
  import About from '../sections/About.svelte';
  import Projects from '../sections/Projects.svelte';
  import Contact from '../sections/Contact.svelte';

  const route = writable('/');
  let current: string;
  route.subscribe((v) => current = v);

  function go(e: Event, path: string) {
    e.preventDefault();
    route.set(path);
  }
</script>

<div class="app-container">
  <Navbar {current} {go} />

  <main class="main-content">
    <div class="page-stack">
      {#if current === '/'}
        <div class="page" in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
          <Home />
        </div>
      {:else if current === '/about'}
        <div class="page" in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
          <About />
        </div>
      {:else if current === '/projects'}
        <div class="page" in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
          <Projects />
        </div>
      {:else if current === '/contact'}
        <div class="page" in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
          <Contact />
        </div>
      {/if}
    </div>
  </main>

  <footer class="footer">
    <p>Made with <span class="heart">❤</span> by <a href="https://github.com/asteriau" target="_blank" rel="noopener noreferrer">asteria</a></p>
    <p>Site licensed under <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GPL v3</a> • <a href="https://github.com/asteriau/asteria.moe" class="source-link">Site Source</a></p>
  </footer>
</div>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1 0 auto;
  width: 100%;
}

.page-stack {
  width: 100%;
}

.page {
  width: 100%;
}

.model-wrapper {
  position: relative;
  width: 100%;
  height: 500px;
  overflow: hidden;
  border-radius: 20px;
}

.footer {
  flex-shrink: 0;
}

.footer a {
  position: relative;
  display: inline-block;
  transition: filter 0.3s ease, text-shadow 0.3s ease;
}

.footer a::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 100%;
  height: 2px;
  background: var(--main-accent);
  opacity: 0;
  transform: scaleX(0);
  transform-origin: left;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.footer a:hover {
  filter: brightness(1.15);
  text-shadow: 0 0 10px var(--main-accent),
               0 0 50px var(--main-accent);
}

.footer a:hover::after {
  opacity: 1;
  transform: scaleX(1);
}
</style>
