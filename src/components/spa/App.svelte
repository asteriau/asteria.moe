<script>
  import { writable } from 'svelte/store';
  import Navbar from '../Navbar.svelte';
  import Home from '../sections/Home.svelte';
  import About from '../sections/About.svelte';
  import Projects from '../sections/Projects.svelte';
  import Contact from '../sections/Contact.svelte';

  const route = writable('/');

  let current;
  route.subscribe((v) => current = v);

  function go(e, path) {
    e.preventDefault();
    route.set(path);
  }
</script>

<Navbar {current} {go} />

<main class="main-content">
  {#if current === '/'}
    <Home />
  {:else if current === '/about'}
    <About />
  {:else if current === '/projects'}
    <Projects />
  {:else if current === '/contact'}
    <Contact />
  {/if}
</main>
