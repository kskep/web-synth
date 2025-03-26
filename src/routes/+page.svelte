<script>
  import Workspace from '$lib/components/Workspace.svelte';
  import { browser } from '$app/environment';
</script>

<main>
  <Workspace />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background-color: #1a1c20;
  }
</style>