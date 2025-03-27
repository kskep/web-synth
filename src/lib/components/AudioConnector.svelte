<script>
    import { onDestroy } from 'svelte';

    /** @type {AudioNode | null} */
    export let input = null; // Input AudioNode
    /** @type {AudioNode | null} */
    export let output = null; // Output AudioNode

    /** @type {AudioNode | null} */
    let currentInput = null; // Track the currently connected input

    // Handle input/output changes reactively
    $: if (input !== currentInput && output) {
        // Input has changed!
        // 1. Disconnect the OLD input (if any)
        if (currentInput) {
            try {
                console.log(`AudioConnector: Disconnecting OLD input`, currentInput);
                currentInput.disconnect(output);
            } catch (e) {
                // Ignore errors (might already be disconnected)
            }
        }

        // 2. Connect the NEW input (if it exists)
        if (input) {
            try {
                console.log(`AudioConnector: Connecting NEW input -> output`, input, output);
                input.connect(output);
                currentInput = input; // Update tracking variable
            } catch(e) {
                console.error("AudioConnector: Failed to connect input", e);
                currentInput = null;
            }
        } else {
            currentInput = null; // No input connected
        }
    } else if (input && output && !currentInput) {
        // Initial connection if input/output provided on mount
        try {
            console.log(`AudioConnector: Initial connect`, input, output);
            input.connect(output);
            currentInput = input;
        } catch(e) {
            console.error("AudioConnector: Failed initial connect", e);
        }
    }

    onDestroy(() => {
        // Disconnect on destroy
        if (currentInput && output) {
            try {
                console.log(`AudioConnector: Disconnecting on destroy`, currentInput);
                currentInput.disconnect(output);
            } catch (e) {}
        }
    });
</script>
