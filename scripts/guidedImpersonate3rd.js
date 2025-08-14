// scripts/guidedImpersonate3rd.js
import { getContext, extension_settings } from '../../../../extensions.js';
import { extensionName, getPreviousImpersonateInput, setPreviousImpersonateInput, getLastImpersonateResult, setLastImpersonateResult } from '../index.js';
import { handlePresetSwitching } from './utils/presetUtils.js'; 

const guidedImpersonate3rd = async () => {
    const textarea = document.getElementById('send_textarea');
    if (!textarea) {
        console.error('[GuidedGenerations] Textarea #send_textarea not found.');
        return;
    }
    const originalInput = textarea.value;
    const lastGeneratedText = getLastImpersonateResult(); // Use shared getter

    // Check if the current input matches the last generated text (from any impersonation)
    if (lastGeneratedText && originalInput === lastGeneratedText) {
        textarea.value = getPreviousImpersonateInput(); // Use shared getter
        textarea.dispatchEvent(new Event('input', { bubbles: true })); 
        return; // Restoration done, exit
    }

    // --- If not restoring, proceed with impersonation ---
    setPreviousImpersonateInput(originalInput); // Use shared setter

    // --- Get Settings ---
    const presetName = extension_settings[extensionName]?.presetImpersonate3rd ?? '';

    // Save the input state using the shared function
    const promptTemplate = extension_settings[extensionName]?.promptImpersonate3rd ?? '';
    const filledPrompt = promptTemplate.replace('{{input}}', originalInput);

    // Handle preset logic
    let stscriptCommand;
    if (presetName) {
        stscriptCommand = `/preset name="${presetName}" silent=true | /impersonate await=true persona={{charnames[2]}} ${filledPrompt} |`;
    } else {
        stscriptCommand = `/impersonate await=true persona={{charnames[2]}} ${filledPrompt} |`; // No preset
    }

    // Handle preset switching using unified utility
    const presetKey = 'presetImpersonate3rd';
    const presetValue = extension_settings[extensionName]?.[presetKey] ?? '';
    console.log(`[GuidedGenerations] Using preset for 3rd-person impersonate: ${presetValue || 'none'}`);
    
    const { switch: switchPreset, restore } = handlePresetSwitching(presetValue);
    
    const fullScript = `// 3rd-person impersonate guide|
${stscriptCommand}`;

    try {
        const context = getContext(); 
        if (typeof context.executeSlashCommandsWithOptions === 'function') {
            // Switch preset before executing and wait for it to complete
            console.log('[GuidedGenerations] Switching preset/profile before execution...');
            await switchPreset();
            console.log('[GuidedGenerations] Preset/profile switch completed, executing script...');
            
            await context.executeSlashCommandsWithOptions(fullScript);
            
            // After completion, read the new input and store it in shared state
            setLastImpersonateResult(textarea.value); // Use shared setter
            console.log('[GuidedGenerations] Guided Impersonate (3rd) stscript executed, new input stored in shared state.');
        } else {
            console.error('[GuidedGenerations] context.executeSlashCommandsWithOptions not found!');
        }
    } catch (error) {
        console.error(`[GuidedGenerations] Error executing Guided Impersonate (3rd) stscript: ${error}`);
        setLastImpersonateResult(''); // Clear shared state on error
    } finally {
        // After completion, restore original preset using utility restore function
        console.log('[GuidedGenerations] Restoring original preset/profile...');
        await restore();
        console.log('[GuidedGenerations] Preset/profile restore completed.');
    } 
};

// Export the function
export { guidedImpersonate3rd };
