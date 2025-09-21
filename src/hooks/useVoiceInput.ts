// Voice Input Hook - Day 5
// Team Lead: Claude  
// Web Speech API integration for voice commands

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseVoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  commands?: Record<string, () => void>;
}

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}) => {
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US',
    onResult,
    onError,
    commands = {}
  } = options;
  
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isSupported: false
  });
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setState(prev => ({ ...prev, isSupported: !!SpeechRecognition }));
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition is not supported in this browser');
      return;
    }
    
    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setState(prev => ({ 
        ...prev, 
        isListening: true, 
        error: null 
      }));
      
      // Add visual feedback
      document.body.classList.add('voice-active');
    };
    
    recognition.onend = () => {
      setState(prev => ({ 
        ...prev, 
        isListening: false 
      }));
      
      document.body.classList.remove('voice-active');
      
      // Auto-restart if continuous mode
      if (continuous && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Already started, ignore
          }
        }, 100);
      }
    };
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      
      if (finalTranscript) {
        const trimmed = finalTranscript.trim();
        
        setState(prev => ({
          ...prev,
          transcript: prev.transcript + ' ' + trimmed,
          interimTranscript: ''
        }));
        
        // Check for commands
        const lowerTranscript = trimmed.toLowerCase();
        for (const [command, action] of Object.entries(commands)) {
          if (lowerTranscript.includes(command.toLowerCase())) {
            action();
            break;
          }
        }
        
        // Callback with final result
        onResult?.(trimmed, true);
      }
      
      if (interim) {
        setState(prev => ({
          ...prev,
          interimTranscript: interim
        }));
        
        // Callback with interim result
        onResult?.(interim, false);
      }
      
      // Reset timeout for auto-stop
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (!continuous) {
        timeoutRef.current = setTimeout(() => {
          recognition.stop();
        }, 2000);
      }
    };
    
    recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied';
          break;
        case 'network':
          errorMessage = 'Network error';
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isListening: false 
      }));
      
      onError?.(errorMessage);
      document.body.classList.remove('voice-active');
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.body.classList.remove('voice-active');
    };
  }, [continuous, interimResults, language, onResult, onError, commands]);
  
  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Speech recognition not supported' 
      }));
      return;
    }
    
    try {
      // Request microphone permission
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          recognitionRef.current?.start();
        })
        .catch((err) => {
          setState(prev => ({ 
            ...prev, 
            error: 'Microphone permission denied' 
          }));
          onError?.('Microphone permission denied');
        });
    } catch (error) {
      // Already started, ignore
      if (error.message !== 'Failed to execute \'start\' on \'SpeechRecognition\': recognition has already started.') {
        console.error('Failed to start recognition:', error);
      }
    }
  }, [state.isSupported, onError]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);
  
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);
  
  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: ''
    }));
  }, []);
  
  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    fullTranscript: state.transcript + state.interimTranscript
  };
};

// Voice commands hook for common actions
export const useVoiceCommands = () => {
  const commands = {
    'add agenda': () => {
      window.dispatchEvent(new CustomEvent('shortcut', { 
        detail: { action: 'add-agenda' } 
      }));
    },
    'new note': () => {
      window.dispatchEvent(new CustomEvent('shortcut', { 
        detail: { action: 'new-note' } 
      }));
    },
    'quick action': () => {
      window.dispatchEvent(new CustomEvent('shortcut', { 
        detail: { action: 'quick-action' } 
      }));
    },
    'open assistant': () => {
      window.dispatchEvent(new CustomEvent('assistant:toggle'));
    },
    'close assistant': () => {
      window.dispatchEvent(new CustomEvent('assistant:close'));
    },
    'what\'s next': () => {
      window.dispatchEvent(new CustomEvent('assistant:command', {
        detail: { command: 'next-task' }
      }));
    },
    'summarize day': () => {
      window.dispatchEvent(new CustomEvent('assistant:command', {
        detail: { command: 'summarize-day' }
      }));
    },
    'mark complete': () => {
      window.dispatchEvent(new CustomEvent('task:complete-selected'));
    }
  };
  
  return useVoiceInput({
    continuous: false,
    commands,
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        console.log('[Voice Command]:', transcript);
      }
    }
  });
};