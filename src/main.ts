import App from './App.svelte';
import '../static/audio-processor';

const app = new App({
  target: document.getElementById('app')!,
});

// Audio setup
const audioContext = new AudioContext();
async function initAudio() {
  await audioContext.audioWorklet.addModule('/src/audio-processor.ts');
  const processorNode = new AudioWorkletNode(audioContext, 'basic-processor');
  processorNode.connect(audioContext.destination);
}

// Start audio when user interacts (due to browser audio policies)
document.addEventListener('click', () => {
  audioContext.resume().then(() => initAudio());
});

export default app;