/* eslint-disable @typescript-eslint/no-explicit-any */

// Function to get  from session storage
export const getSessionStorage = (keyName: string) => {
  try {
    const savedItem = sessionStorage.getItem(keyName);
    // Check if the saved item looks like a JSON object or not
    if (savedItem && (savedItem.startsWith('{') || savedItem.startsWith('['))) {
      return JSON.parse(savedItem);
    }
    return savedItem;
  } catch (_error) {
    console.error(`Error parsing sessionStorage item '${keyName}':`, _error);
    return null;
  }
};

// Function to save  to session storage
export const saveSessionStorage = (keyName: string, value: any) => {
  try {
    if (typeof value === 'object') {
      sessionStorage.setItem(keyName, JSON.stringify(value));
    } else {
      sessionStorage.setItem(keyName, value);
    }
  } catch (_error) {
    console.error(`Error saving sessionStorage item '${keyName}':`, _error);
  }
};

// Function to delete  from session storage
export const deleteSessionStorage = (keyName: string) => {
  try {
    sessionStorage.removeItem(keyName);
  } catch (_error) {
    console.error(`Error removing sessionStorage item '${keyName}':`, _error);
  }
};

// Function to update  in session storage
export const updateSessionStorage = (keyName: string, updateVal: any) => {
  try {
    const getItem = sessionStorage.getItem(keyName);
    if (!getItem) {
      console.warn(`Item with key '${keyName}' not found!`);
      return;
    }
    if (typeof updateVal === 'object') {
      sessionStorage.setItem(keyName, JSON.stringify(updateVal));
    } else {
      sessionStorage.setItem(keyName, updateVal);
    }
  } catch (_error) {
    console.error(`Error updating sessionStorage item '${keyName}':`, _error);
  }
};

export const clearSessionStorage = () => {
  try {
    sessionStorage.clear();
  } catch (_error) {
    console.error('Error clearing sessionStorage:', _error);
  }
};
