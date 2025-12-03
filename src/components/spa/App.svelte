<script lang="ts">
  import { writable } from 'svelte/store';
  import { fade, slide } from 'svelte/transition';
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

<Navbar {current} {go} />

<main class="main-content">
  {#if current === '/'}
    <div in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
      <Home />
    </div>
  {:else if current === '/about'}
    <div in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
      <About />
    </div>
  {:else if current === '/projects'}
    <div in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
      <Projects />
    </div>
  {:else if current === '/contact'}
    <div in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
      <Contact />
    </div>
  {/if}
</main>


<style>
  .main-content {
    position: relative;
    overflow: hidden; /* prevent scroll jump during transitions */
  }

  main > * {
    position: absolute;
    width: 100%;
    top: 0;
    left: 0;
  }
</style>
