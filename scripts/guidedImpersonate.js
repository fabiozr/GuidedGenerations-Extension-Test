// scripts/guidedImpersonate.js
import { getPreviousImpersonateInput, setPreviousImpersonateInput, getLastImpersonateResult, setLastImpersonateResult } from '../index.js'; // Import shared state functions
import { getContext, extension_settings } from '../../../../extensions.js';
import { extensionName, runWithConnectionProfile } from '../index.js';
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
    
    const { switch: switchPreset, restore } = handlePresetSwitching(presetValue);

    // Use user-defined impersonate prompt override
    const promptTemplate = extension_settings[extensionName]?.promptImpersonate1st ?? '';
    const filledPrompt = promptTemplate.replace('{{input}}', currentInputText);

    // Build STScript (for legacy flow) and Connection Profile instruction (Option B)
    const stscriptCommand = `/impersonate await=true ${filledPrompt} |`;
    const fullScript = `// Impersonate guide|
${stscriptCommand}`;

    try {
        const context = getContext();
        const useProfile = !!extension_settings[extensionName]?.useConnectionProfile;
        if (useProfile && extension_settings[extensionName]?.profileId) {
            // Option B: run via Connection Profile directly
            await runWithConnectionProfile(filledPrompt);
            setLastImpersonateResult(textarea.value);
        } else if (typeof context.executeSlashCommandsWithOptions === 'function') {
            // Legacy: run via STScript
            switchPreset();
            await context.executeSlashCommandsWithOptions(fullScript);
            setLastImpersonateResult(textarea.value);
            restore();
        } else {
            console.error('[GuidedGenerations] No execution path available for impersonate.');
        }
    } catch (error) {
        console.error(`[GuidedGenerations] Error executing Guided Impersonate (1st) stscript: ${error}`);
        setLastImpersonateResult(''); // Use setter to clear shared state on error
        
        // Restore original preset on error
        restore();
    }
};

// Export the function
export { guidedImpersonate };
