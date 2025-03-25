<script>
  import KickDrumDemo from '$lib/components/KickDrumDemo.svelte';
  import { browser } from '$app/environment';
</script>

<h1>Web Audio API Synthesis Demo</h1>

{#if browser}
  <KickDrumDemo />
{:else}
  <p style="text-align: center; padding: 2em;">Loading Synthesizer...</p>
{/if}

<style>
  h1 {
    text-align: center;
    color: #333;
    margin: 1em 0;
  }
</style>