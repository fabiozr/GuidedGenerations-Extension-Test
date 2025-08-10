import { getContext } from '../../../../../extensions.js';
import { extensionName } from '../../index.js';

/**
 * Handles preset switching with legacy name support and provides restore function
 * @param {string} presetValue - The preset ID or name to switch to
 * @param {boolean} autoRestore - Whether to automatically restore the original preset when the returned restore function is called
 * @returns {Object} - Object containing originalPresetId, targetPresetId, and restore function
 */
import { getContext, extension_settings } from '../../../../extensions.js';

export function handlePresetSwitching(presetValue) {
    const extensionName = "GuidedGenerations-Extension-test";
    let originalPresetId = null;
    let targetPresetId = null;
    let isTextCompletionMode = false;
    let presetIdToNameMap = {}; // Moved to function scope

    // Connection Profile switching (preferred when enabled)
    const useConnectionProfile = !!extension_settings?.[extensionName]?.useConnectionProfile;
    const profileId = extension_settings?.[extensionName]?.profileId;
    let targetProfileName = null;
    let originalProfileName = null;
    if (useConnectionProfile && profileId) {
        try {
            const ctx = getContext();
            const profiles = ctx?.extensionSettings?.connectionManager?.profiles || [];
            // Detect current/active profile heuristically before switching
            const active = profiles.find(p => p?.selected || p?.isActive || p?.active || p?.current);
            originalProfileName = active?.name || active?.title || active?.id || null;
            const match = profiles.find(p => p && (p.id === profileId));
            // Try common fields for display name
            targetProfileName = match?.name || match?.title || match?.id || null;
        } catch (e) {
            console.warn(`[${extensionName}] Failed to resolve connection profile by id`, e);
        }
    }

    console.log(`[${extensionName}] handlePresetSwitching called with presetValue:`, presetValue, 'useConnectionProfile:', useConnectionProfile, 'targetProfileName:', targetProfileName);

    // If connection profile is chosen, we will skip preset resolution entirely
    if (!targetProfileName && presetValue) {
        console.log(`[${extensionName}] Getting preset manager...`);
        const presetManager = getContext()?.getPresetManager?.();
        console.log(`[${extensionName}] Preset manager:`, presetManager);
        
        if (presetManager) {
            console.log(`[${extensionName}] Getting preset list...`);
            const presetList = presetManager.getPresetList();
            console.log(`[${extensionName}] Preset list:`, presetList);
            
            const presetValueStr = String(presetValue);
            console.log(`[${extensionName}] Looking for preset with value:`, presetValueStr);

            // Handle multiple possible data structures from getPresetList()
            let validPresetIds = [];
            let presetNameToIdMap = {};

            // Check if presetList has a preset_names property (newer format)
            if (presetList && presetList.preset_names) {
                console.log(`[${extensionName}] Found preset_names property:`, presetList.preset_names);
                const presetNames = presetList.preset_names;
                
                if (Array.isArray(presetNames)) {
                    console.log(`[${extensionName}] Text Completion format: preset_names is an array`);
                    isTextCompletionMode = true;
                    // Text Completion format: preset_names is an array of names
                    validPresetIds = presetNames.map((name, index) => String(index));
                    presetNames.forEach((name, index) => {
                        presetNameToIdMap[String(name).toLowerCase()] = String(index);
                        presetIdToNameMap[String(index)] = String(name);
                    });
                    console.log(`[${extensionName}] Valid preset IDs (Text Completion):`, validPresetIds);
                    console.log(`[${extensionName}] Preset name to ID map:`, presetNameToIdMap);
                    console.log(`[${extensionName}] Preset ID to name map:`, presetIdToNameMap);
                } else {
                    console.log(`[${extensionName}] Chat Completion format: preset_names is an object`);
                    isTextCompletionMode = false;
                    // Chat Completion format: preset_names is an object with name-to-id mapping
                    validPresetIds = Object.values(presetNames).map(id => String(id));
                    Object.entries(presetNames).forEach(([name, id]) => {
                        presetNameToIdMap[String(name).toLowerCase()] = String(id);
                        presetIdToNameMap[String(id)] = String(name);
                    });
                    console.log(`[${extensionName}] Valid preset IDs (Chat Completion):`, validPresetIds);
                    console.log(`[${extensionName}] Preset name to ID map:`, presetNameToIdMap);
                    console.log(`[${extensionName}] Preset ID to name map:`, presetIdToNameMap);
                }
            } else if (Array.isArray(presetList)) {
                console.log(`[${extensionName}] Legacy format: presetList is an array`);
                isTextCompletionMode = false;
                // Legacy format: presetList is an array of objects with id and name properties
                validPresetIds = presetList.map(p => String(p.id));
                presetList.forEach(preset => {
                    if (preset.name && preset.id !== undefined) {
                        presetNameToIdMap[String(preset.name).toLowerCase()] = String(preset.id);
                        presetIdToNameMap[String(preset.id)] = String(preset.name);
                    }
                });
                console.log(`[${extensionName}] Valid preset IDs (Legacy):`, validPresetIds);
                console.log(`[${extensionName}] Preset name to ID map:`, presetNameToIdMap);
                console.log(`[${extensionName}] Preset ID to name map:`, presetIdToNameMap);
            } else {
                console.log(`[${extensionName}] Unknown preset list format:`, presetList);
            }

            // Try to find the target preset
            console.log(`[${extensionName}] Checking if presetValueStr '${presetValueStr}' is in validPresetIds:`, validPresetIds);
            if (validPresetIds.includes(presetValueStr)) {
                targetPresetId = presetValueStr;
                console.log(`[${extensionName}] Found target preset by ID:`, targetPresetId);
            } else {
                console.log(`[${extensionName}] Not found by ID, trying by name...`);
                // Try to find by name (case-insensitive)
                const normalizedValue = presetValueStr.toLowerCase();
                console.log(`[${extensionName}] Looking for normalized value:`, normalizedValue);
                console.log(`[${extensionName}] Available names:`, Object.keys(presetNameToIdMap));
                
                if (presetNameToIdMap[normalizedValue]) {
                    targetPresetId = presetNameToIdMap[normalizedValue];
                    console.log(`[${extensionName}] Found target preset by name:`, targetPresetId);
                } else {
                    console.log(`[${extensionName}] Preset not found by name either`);
                }
            }

            if (!targetPresetId) {
                console.warn(`${extensionName}: Preset '${presetValue}' not found. Valid IDs: ${validPresetIds.join(', ')}`);
            } else {
                console.log(`[${extensionName}] Target preset ID determined:`, targetPresetId);
                console.log(`[${extensionName}] Is text completion mode:`, isTextCompletionMode);
            }
        } else {
            console.error(`[${extensionName}] Preset manager not available`);
        }
    } else {
        console.log(`[${extensionName}] No presetValue provided`);
    }

    const switchPreset = async () => {
        console.log(`[${extensionName}] switchPreset called with targetPresetId:`, targetPresetId);
        // Prefer connection profile switching if enabled and resolved
        if (targetProfileName) {
            try {
                const ctx = getContext();
                await ctx?.executeSlashCommandsWithOptions?.(`/profile ${String(targetProfileName).replace(/"/g, '\\"')}`);
                console.log(`[${extensionName}] Switched connection profile to:`, targetProfileName);
            } catch (err) {
                console.error(`[${extensionName}] Error switching connection profile to '${targetProfileName}':`, err);
            }
            return;
        }

        if (!targetPresetId) {
            console.log(`[${extensionName}] No target preset ID, skipping preset switch`);
            return;
        }

        try {
            console.log(`[${extensionName}] Getting preset manager for switching...`);
            const presetManager = getContext()?.getPresetManager?.();
            console.log(`[${extensionName}] Preset manager for switching:`, presetManager);
            
            if (presetManager) {
                console.log(`[${extensionName}] Getting current selected preset...`);
                originalPresetId = presetManager.getSelectedPreset();
                console.log(`[${extensionName}] Current selected preset:`, originalPresetId);
                console.log(`[${extensionName}] Target preset ID:`, targetPresetId);
                console.log(`[${extensionName}] Is text completion mode:`, isTextCompletionMode);
                
                // For text completion mode, we need to convert the ID to name for switching
                let switchValue = targetPresetId;
                if (isTextCompletionMode && presetIdToNameMap[targetPresetId]) {
                    switchValue = presetIdToNameMap[targetPresetId];
                    console.log(`[${extensionName}] Converting ID ${targetPresetId} to name ${switchValue} for text completion mode`);
                }
                
                if (switchValue !== originalPresetId) {
                    console.log(`[${extensionName}] Switching from ${originalPresetId} to ${switchValue}...`);
                    presetManager.selectPreset(switchValue);
                    console.log(`[${extensionName}] Preset switch completed`);
                    
                    // Verify the switch
                    const newSelectedPreset = presetManager.getSelectedPreset();
                    console.log(`[${extensionName}] Verification - new selected preset:`, newSelectedPreset);
                } else {
                    console.log(`[${extensionName}] No switch needed - already on target preset`);
                }
            } else {
                console.error(`[${extensionName}] Preset manager not available for switching`);
            }
        } catch (error) {
            console.error(`${extensionName}: Error switching preset:`, error);
        }
    };

    const restore = async () => {
        console.log(`[${extensionName}] restore called with originalPresetId:`, originalPresetId, 'targetPresetId:', targetPresetId);
        // Restore previous connection profile if we switched and detected an original
        if (targetProfileName) {
            if (originalProfileName && originalProfileName !== targetProfileName) {
                try {
                    const ctx = getContext();
                    await ctx?.executeSlashCommandsWithOptions?.(`/profile ${String(originalProfileName).replace(/"/g, '\\"')}`);
                    console.log(`[${extensionName}] Restored connection profile to:`, originalProfileName);
                } catch (err) {
                    console.error(`[${extensionName}] Error restoring connection profile to '${originalProfileName}':`, err);
                }
            }
            return;
        }

        if (!originalPresetId || !targetPresetId || originalPresetId === targetPresetId) {
            console.log(`[${extensionName}] No restore needed - missing IDs or same preset`);
            return;
        }
        
        try {
            console.log(`[${extensionName}] Getting preset manager for restore...`);
            const presetManager = getContext()?.getPresetManager?.();
            console.log(`[${extensionName}] Preset manager for restore:`, presetManager);
            
            if (presetManager) {
                console.log(`[${extensionName}] Getting current preset for restore check...`);
                const currentPreset = presetManager.getSelectedPreset();
                console.log(`[${extensionName}] Current preset:`, currentPreset, 'Target preset was:', targetPresetId);
                
                // For text completion mode, we need to check if we're on the target preset by name
                let shouldRestore = false;
                if (isTextCompletionMode) {
                    const targetPresetName = presetIdToNameMap[targetPresetId];
                    shouldRestore = currentPreset === targetPresetName;
                    console.log(`[${extensionName}] Text completion mode - checking if current preset '${currentPreset}' matches target name '${targetPresetName}':`, shouldRestore);
                } else {
                    shouldRestore = currentPreset === targetPresetId;
                    console.log(`[${extensionName}] Chat completion mode - checking if current preset '${currentPreset}' matches target ID '${targetPresetId}':`, shouldRestore);
                }
                
                if (shouldRestore) {
                    // For text completion mode, we need to convert the original ID to name for restoring
                    let restoreValue = originalPresetId;
                    if (isTextCompletionMode && presetIdToNameMap[originalPresetId]) {
                        restoreValue = presetIdToNameMap[originalPresetId];
                        console.log(`[${extensionName}] Converting original ID ${originalPresetId} to name ${restoreValue} for text completion mode restore`);
                    }
                    
                    console.log(`[${extensionName}] Restoring from ${currentPreset} to ${restoreValue}...`);
                    presetManager.selectPreset(restoreValue);
                    console.log(`[${extensionName}] Preset restore completed`);
                    
                    // Verify the restore
                    const newSelectedPreset = presetManager.getSelectedPreset();
                    console.log(`[${extensionName}] Verification - new selected preset after restore:`, newSelectedPreset);
                } else {
                    console.log(`[${extensionName}] No restore needed - not on target preset`);
                }
            } else {
                console.error(`[${extensionName}] Preset manager not available for restore`);
            }
        } catch (restoreError) {
            console.error(`${extensionName}: Error restoring original preset:`, restoreError);
        }
    };

    console.log(`[${extensionName}] Returning switch and restore functions`);
    return { switch: switchPreset, restore };
}
