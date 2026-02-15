/* eslint-disable @typescript-eslint/no-explicit-any */

// Function to get  from local storage
export const getLocalStorage = (keyName: string) => {
  try {
    const savedItem = localStorage.getItem(keyName);
    // Check if the saved item looks like a JSON object or not
    if (savedItem && (savedItem.startsWith('{') || savedItem.startsWith('['))) {
      return JSON.parse(savedItem);
    }
    return savedItem;
  } catch (_error) {
    console.error(`Error parsing localStorage item '${keyName}':`, _error);
    return null;
  }
};

// Function to save  to local storage
export const saveLocalStorage = (keyName: string, value: any) => {
  try {
    if (typeof value === 'object') {
      localStorage.setItem(keyName, JSON.stringify(value));
    } else {
      localStorage.setItem(keyName, value);
    }
  } catch (_error) {
    console.error(`Error saving localStorage item '${keyName}':`, _error);
  }
};

// Function to delete  from local storage
export const deleteLocalStorage = (keyName: string) => {
  try {
    localStorage.removeItem(keyName);
  } catch (_error) {
    console.error(`Error removing localStorage item '${keyName}':`, _error);
  }
};

// Function to update  in local storage
export const updateLocalStorage = (keyName: string, updateVal: any) => {
  try {
    const getItem = localStorage.getItem(keyName);
    if (!getItem) {
      console.warn(`Item with key '${keyName}' not found!`);
      return;
    }
    if (typeof updateVal === 'object') {
      localStorage.setItem(keyName, JSON.stringify(updateVal));
    } else {
      localStorage.setItem(keyName, updateVal);
    }
  } catch (_error) {
    console.error(`Error updating localStorage item '${keyName}':`, _error);
  }
};

export const clearLocalStorage = () => {
  try {
    localStorage.clear();
  } catch (_error) {
    console.error('Error clearing localStorage:', _error);
  }
};
