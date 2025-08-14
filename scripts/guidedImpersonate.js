// scripts/guidedImpersonate.js
import { getPreviousImpersonateInput, setPreviousImpersonateInput, getLastImpersonateResult, setLastImpersonateResult } from '../index.js'; // Import shared state functions
import { getContext, extension_settings } from '../../../../extensions.js';
import { extensionName } from '../index.js';
import { handlePresetSwitching } from './utils/presetUtils.js';

const guidedImpersonate = async () => {
    const textarea = document.getElementById('send_textarea');
    if (!textarea) {
        console.error('[GuidedGenerations] Textarea #send_textarea not found.');
        return;
    }
    const currentInputText = textarea.value;
    const lastGeneratedText = getLastImpersonateResult(); // Use getter

    // Check if the current input matches the last generated text
    if (lastGeneratedText && currentInputText === lastGeneratedText) {
        textarea.value = getPreviousImpersonateInput(); // Use getter
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return; // Restoration done, exit
    }

    // --- If not restoring, proceed with impersonation ---
    setPreviousImpersonateInput(currentInputText); // Use setter

    // Handle preset switching using unified utility
    const presetKey = 'presetImpersonate1st';
    const presetValue = extension_settings[extensionName]?.[presetKey] ?? '';
    console.log(`[GuidedGenerations] Using preset for impersonate: ${presetValue || 'none'}`);
    
    const { executeWithPresetSwitching } = handlePresetSwitching(presetValue);

    // Use user-defined impersonate prompt override
    const promptTemplate = extension_settings[extensionName]?.promptImpersonate1st ?? '';
    const filledPrompt = promptTemplate.replace('{{input}}', currentInputText);

    // Build STScript without preset switching
    const stscriptCommand = `/impersonate await=true ${filledPrompt} |`;
    const fullScript = `// Impersonate guide|
${stscriptCommand}`;

    try {
        const context = getContext();
        if (typeof context.executeSlashCommandsWithOptions === 'function') {
            // Use the unified function that handles preset switching and restoration
            await executeWithPresetSwitching(async () => {
                await context.executeSlashCommandsWithOptions(fullScript);
                
                // After completion, read the new input and store it using the setter
                setLastImpersonateResult(textarea.value);
                console.log('[GuidedGenerations] Guided Impersonate (1st) stscript executed, new input stored in shared state.');
            });
        } else {
            console.error('[GuidedGenerations] context.executeSlashCommandsWithOptions not found!');
        }
    } catch (error) {
        console.error(`[GuidedGenerations] Error executing Guided Impersonate (1st) stscript: ${error}`);
        setLastImpersonateResult(''); // Use setter to clear shared state on error
    }
};

// Export the function
export { guidedImpersonate };
