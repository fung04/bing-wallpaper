
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AppConfig } from './types.ts';

function persistentStore<T>(key: string, initialValue: T) {
    if (!browser) {
        return writable<T>(initialValue);
    }

    const storedValue = localStorage.getItem(key);
    const data: T = storedValue ? JSON.parse(storedValue) : initialValue;
    const store = writable<T>(data);

    store.subscribe((value) => {
        if (browser) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });

    return store;
}

export const appConfig = persistentStore<AppConfig>('appConfig', {
    selectedCountries: ['CN-zh', 'ROW-en'],
    selectedResolution: '_1920x1080',
    intervalSec: 30,
    totalImages: 30,
    isEditting: false,
});