import { useState, useCallback } from 'react';

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

interface UseNativeShareReturn {
  isSupported: boolean;
  share: (data: ShareData) => Promise<boolean>;
  isSharing: boolean;
}

export function useNativeShare(): UseNativeShareReturn {
  const [isSharing, setIsSharing] = useState(false);

  // Check if Web Share API is supported
  const isSupported = typeof navigator !== 'undefined' && 'share' in navigator;

  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsSharing(true);
    
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      // User cancelled or error occurred
      console.log('Share cancelled or failed:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    share,
    isSharing
  };
}
