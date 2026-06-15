/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, X, Volume2, ShieldAlert, Bot, HelpCircle } from 'lucide-react';
import { Category, Expense } from '../types';

interface VoiceAssistantProps {
  categories: Category[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  currencySymbol: string;
}

// Spoken numbers converter
function parseSpokenNaturalNumber(text: string): number | null {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const units: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
  };
  const tens: Record<string, number> = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };
  const scales: Record<string, number> = {
    hundred: 100, thousand: 1000
  };

  let total = 0;
  let currentAccumulator = 0;
  let foundNumber = false;

  for (const word of words) {
    if (units[word] !== undefined) {
      currentAccumulator += units[word];
      foundNumber = true;
    } else if (tens[word] !== undefined) {
      currentAccumulator += tens[word];
      foundNumber = true;
    } else if (scales[word] !== undefined) {
      currentAccumulator = (currentAccumulator || 1) * scales[word];
      foundNumber = true;
      if (word === 'thousand') {
        total += currentAccumulator;
        currentAccumulator = 0;
      }
    } else if (/^\d+(\.\d+)?$/.test(word)) {
      currentAccumulator = parseFloat(word);
      foundNumber = true;
    }
  }
  total += currentAccumulator;
  return foundNumber ? total : null;
}

// Spoken currency parsing with fractional/cents logic
function parseSpokenAmount(text: string): number | null {
  const cleaned = text.toLowerCase().trim();

  // 1. If it's a clean digit representation (e.g., "12.5" or "12")
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  // 2. Split on currency words (dollars, bucks, etc.)
  const currencyRegex = /\b(?:dollars?|bucks?|euros?|pounds?|gbp)\b/gi;
  if (currencyRegex.test(cleaned)) {
    const parts = cleaned.split(currencyRegex);
    const dollarsStr = parts[0]?.trim() || '';
    let centsStr = parts[1]?.trim() || '';

    // Clean up cents string (remove "and", "cents", "cent", "p")
    centsStr = centsStr
      .replace(/\band\b/gi, '')
      .replace(/\bcents?\b/gi, '')
      .replace(/\bp\b/gi, '')
      .trim();

    const dollars = parseSpokenNaturalNumber(dollarsStr) || 0;
    if (centsStr) {
      const cents = parseSpokenNaturalNumber(centsStr);
      if (cents !== null && cents > 0) {
        const centsVal = cents < 100 ? cents / 100 : cents / 100;
        return dollars + centsVal;
      }
    }
    return dollars > 0 ? dollars : null;
  }

  // 3. Split on "point" or "dot" (e.g. "three point fifty")
  const pointRegex = /\b(?:point|dot)\b/gi;
  if (pointRegex.test(cleaned)) {
    const parts = cleaned.split(pointRegex);
    const whole = parseSpokenNaturalNumber(parts[0]?.trim() || '');
    const fractionalStr = parts[1]?.trim() || '';
    if (whole !== null) {
      const fracWords = fractionalStr.split(/\s+/);
      if (fracWords.length > 1 && fracWords.every(w => /^\d$/.test(w) || ['zero','one','two','three','four','five','six','seven','eight','nine'].includes(w))) {
        const digitMap: Record<string, string> = {
          zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9'
        };
        const decimals = fracWords.map(w => /^\d$/.test(w) ? w : (digitMap[w] || '0')).join('');
        return parseFloat(`${whole}.${decimals}`);
      } else {
        const frac = parseSpokenNaturalNumber(fractionalStr);
        if (frac !== null) {
          const fracLen = frac.toString().length;
          return whole + frac / Math.pow(10, fracLen);
        }
      }
      return whole;
    }
  }

  // 4. Handle double numbers, e.g. "three fifty" of "twelve ninety nine"
  const words = cleaned.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    for (let i = 1; i < words.length; i++) {
      const firstPart = words.slice(0, i).join(' ');
      const secondPart = words.slice(i).join(' ');
      const val1 = parseSpokenNaturalNumber(firstPart);
      const val2 = parseSpokenNaturalNumber(secondPart);
      if (val1 !== null && val2 !== null) {
        const isSecondCents = val2 < 100 && !secondPart.includes('hundred') && !secondPart.includes('thousand');
        if (isSecondCents) {
          return val1 + val2 / 100;
        }
      }
    }
  }

  // 5. Fallback - parse the entire phrase as a plain natural number
  return parseSpokenNaturalNumber(cleaned);
}

// NLP Spoken amounts extractor (checks digits or word formulas)
function extractAmount(text: string): { amount: number; matchedText: string } | null {
  const cleanedText = text.toLowerCase().replace(/-/g, ' ');

  // 1. Complex digit regex with cents support (e.g. "12.50", "15 dollars", "12 dollars 50 cents")
  const complexDigitRegex = /(?:\$|currency)?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?|cents?|euros?|pounds?|gbp)?(?:\s*(?:and|&)?\s*(\d+)\s*(?:cents?|p\b)?)?/gi;
  let match;
  while ((match = complexDigitRegex.exec(cleanedText)) !== null) {
    const dollars = parseFloat(match[1]);
    const centsStr = match[2];
    if (!isNaN(dollars) && dollars > 0) {
      if (centsStr) {
        const cents = parseFloat(centsStr);
        if (!isNaN(cents) && cents > 0) {
          return { amount: dollars + (cents < 100 ? cents / 100 : cents / 100), matchedText: match[0] };
        }
      }
      return { amount: dollars, matchedText: match[0] };
    }
  }

  // 2. Continuous number-word scanner parsing (e.g. "twelve dollars and fifty cents", "three fifty", "forty five bucks")
  const eligibleWords = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
    'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand',
    'and', 'point', 'dot', 'dollars', 'dollar', 'bucks', 'buck', 'cents', 'cent', 'euros', 'euro', 'pounds', 'pound'
  ];

  const ws = cleanedText.split(/\s+/);
  for (let len = ws.length; len >= 1; len--) {
    for (let start = 0; start <= ws.length - len; start++) {
      const phraseWords = ws.slice(start, start + len);
      const hasNumberWord = phraseWords.some(w => ![ 'and', 'point', 'dot', 'dollars', 'dollar', 'bucks', 'buck', 'cents', 'cent', 'euros', 'euro', 'pounds', 'pound' ].includes(w.replace(/[^a-z]/g, '')));
      if (!hasNumberWord) continue;

      const allEligible = phraseWords.every(w => {
        const cleanW = w.replace(/[^a-z0-9]/g, '');
        return eligibleWords.includes(cleanW) || /^\d+(\.\d+)?$/.test(cleanW);
      });

      if (allEligible) {
        const phrase = phraseWords.join(' ');
        const parsed = parseSpokenAmount(phrase);
        if (parsed !== null && parsed > 0) {
          return { amount: parsed, matchedText: phrase };
        }
      }
    }
  }

  // 3. Fallback raw digit check anywhere
  const rawNumMatch = /\b\d+(?:\.\d+)?\b/.exec(cleanedText);
  if (rawNumMatch) {
    const val = parseFloat(rawNumMatch[0]);
    if (val > 0) {
      return { amount: val, matchedText: rawNumMatch[0] };
    }
  }

  return null;
}

// Extraction categories matcher with broad natural vocabulary and smart keyword fuzzy matching
function extractCategory(text: string, categories: Category[]): Category {
  const cleanedText = text.toLowerCase();

  // 1. Direct Name Match (Whole match takes primary precedence)
  for (const cat of categories) {
    const catName = cat.name.toLowerCase();
    if (cleanedText.includes(catName)) {
      return cat;
    }
  }

  // 2. Individual Keyword Matching with Scoring
  // Extracts keywords of length >= 2 from category names to search in spoken text
  const ignore = ['and', 'or', 'with', 'for', 'the', 'an', 'a', '&', 'of', 'in', 'at', 'to', 'on', 'by'];
  let bestMatch: Category | null = null;
  let bestCount = 0;

  for (const cat of categories) {
    const catWords = cat.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2 && !ignore.includes(w));
    
    let matchCount = 0;
    for (const word of catWords) {
      const regex = new RegExp('\\b' + word + '\\b', 'i');
      if (regex.test(cleanedText)) {
        matchCount++;
      }
    }
    if (matchCount > bestCount) {
      bestCount = matchCount;
      bestMatch = cat;
    }
  }

  if (bestMatch && bestCount > 0) {
    return bestMatch;
  }

  // 3. Synonym dictionary matching
  const synonyms: Record<string, string[]> = {
    cat_groceries: [
      'groceries', 'grocery', 'supermarket', 'walmart', 'food shopping', 'safeway', 
      'carrefour', 'aldi', 'whole foods', 'ingredients', 'apples', 'milk', 'bread', 
      'veggies', 'meat', 'costco', 'market', 'tesco', 'kroger', 'lidl', 'sainsburys', 
      'trader joes', 'woolworths', 'coles', 'target', 'provisions', 'vegetables', 'fruit'
    ],
    cat_bars: [
      'bar', 'bars', 'beer', 'drinks', 'pub', 'club', 'cocktails', 'wine', 'alcohol', 
      'brewery', 'nightclub', 'tavern', 'spirits', 'liquor', 'lounge', 'happy hour', 'pub crawl'
    ],
    cat_restaurants: [
      'restaurant', 'restaurants', 'dinner', 'lunch', 'breakfast', 'eat out', 'delivery', 
      'mcdonalds', 'pizza', 'burger', 'cafe', 'coffee', 'starbucks', 'subway', 'sushi', 
      'cafeteria', 'bakery', 'tacos', 'dining', 'brunch', 'food', 'kfc', 'burger king', 
      'dunkin', 'uber eats', 'grubhub', 'doordash', 'boba', 'tea', 'espresso', 'café', 
      'fast food', 'treat', 'snack', 'meals', 'donut'
    ],
    cat_entertainment: [
      'entertainment', 'movies', 'movie', 'cinema', 'netflix', 'spotify', 'subscription', 
      'game', 'gaming', 'tickets', 'concert', 'show', 'theater', 'disney', 'arcade', 
      'playstation', 'xbox', 'nintendo', 'steam', 'hulu', 'hbo', 'prime video', 'youtube prime', 
      'museum', 'bowling', 'mini golf', 'gig', 'festival', 'amusement'
    ],
    cat_business_expense: [
      'business', 'work', 'office', 'reimbursement', 'corporate', 'meeting', 'hardware', 
      'travel work', 'stationery', 'printer', 'traveling for work', 'client lunch', 
      'software license', 'saas', 'domain', 'hosting', 'aws', 'github', 'zoom', 
      'advertising', 'linkedin', 'supplies', 'postage', 'fedex', 'ups', 'mail', 'courier'
    ],
  };

  for (const [catId, words] of Object.entries(synonyms)) {
    const targetCat = categories.find(c => 
      c.id === catId || 
      c.name.toLowerCase().includes(catId.replace('cat_', '').replace('_', ' ')) ||
      catId.replace('cat_', '').replace('_', ' ').split(/\s+/).some(word => c.name.toLowerCase().includes(word))
    );
    if (targetCat) {
      for (const word of words) {
        if (new RegExp('\\b' + word + '\\b', 'i').test(cleanedText)) {
          return targetCat;
        }
      }
    }
  }

  return categories.find(c => c.id === 'cat_uncategorized') || categories[0];
}

// Spoken date extractor
function extractDate(text: string): string {
  const cleanedText = text.toLowerCase();
  const today = new Date();

  if (cleanedText.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().substring(0, 10);
  }

  if (cleanedText.includes('today') || cleanedText.includes('now')) {
    return today.toISOString().substring(0, 10);
  }

  if (cleanedText.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().substring(0, 10);
  }

  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const mName = months[mIdx];
    const mShort = shortMonths[mIdx];
    if (cleanedText.includes(mName) || cleanedText.includes(mShort)) {
      const dayMatches = cleanedText.match(/\b\d{1,2}(?:st|nd|rd|th)?\b/g);
      if (dayMatches) {
        for (const dm of dayMatches) {
          const dVal = parseInt(dm.replace(/\D/g, ''), 10);
          if (dVal > 0 && dVal <= 31) {
            const parsedDate = new Date(today.getFullYear(), mIdx, dVal);
            return parsedDate.toISOString().substring(0, 10);
          }
        }
      }
    }
  }

  return today.toISOString().substring(0, 10);
}

// Payment method synonyms
function extractPaymentMethod(text: string): 'cash' | 'card' | 'digital_wallet' | 'other' {
  const ct = text.toLowerCase();
  if (ct.includes('cash')) return 'cash';
  if (ct.includes('card') || ct.includes('credit') || ct.includes('visa') || ct.includes('debit') || ct.includes('amex') || ct.includes('mastercard')) return 'card';
  if (ct.includes('wallet') || ct.includes('apple pay') || ct.includes('google pay') || ct.includes('phone pay') || ct.includes('paypal')) return 'digital_wallet';
  return 'card'; // default fallback method
}

// Extract notes/merchant info strictly when the word "description" is present
function extractNote(text: string, matchedAmountStr: string, matchedCategoryName: string): string {
  const lowerText = text.toLowerCase();
  
  // Find "description" as a keyword
  const descriptionIndex = lowerText.indexOf('description');
  
  if (descriptionIndex !== -1) {
    let descriptionText = text.substring(descriptionIndex + 'description'.length).trim();
    // Strip leading separation punctuation/symbols
    descriptionText = descriptionText.replace(/^[:\-=\s,;]+/, '').trim();
    if (descriptionText) {
      return descriptionText.charAt(0).toUpperCase() + descriptionText.slice(1);
    }
  }
  
  // Per strict specifications, don't place anything in description unless "description" is explicitly spoken
  return "";
}

export function VoiceAssistant({ categories, onAddExpense, currencySymbol }: VoiceAssistantProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening_hotword' | 'awaiting_more' | 'processing' | 'speaking'>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('Welcome back! Say "Hey Google" followed by your transaction to add it.');
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const consecutiveSilenceCount = useRef(0);
  const hasCheckedDeepLink = useRef(false);
  const speechDebouncerRef = useRef<any>(null);

  // Keep Ref mirrors of reactive state to avoid stale Web Speech API closures
  const isEnabledRef = useRef(isEnabled);
  const voiceStateRef = useRef(voiceState);
  const categoriesRef = useRef(categories);
  const isListeningRef = useRef(false);
  const processSpeechInputRef = useRef<(transcript: string) => void>(() => {});

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // Check URL parameters for offline/Google Assistant deep-link queries on boot
  useEffect(() => {
    if (categories.length === 0 || hasCheckedDeepLink.current) return;
    hasCheckedDeepLink.current = true;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const voiceCommand = urlParams.get('voiceCommand');
      const amountParam = urlParams.get('amount');

      if (voiceCommand) {
        // Clear query parameters from address bar to avoid duplicate runs
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          handleParseAndAdd(decodeURIComponent(voiceCommand));
        }, 1200); // slight delay to allow client assets to load
      } else if (amountParam) {
        const amount = parseFloat(amountParam);
        if (!isNaN(amount) && amount > 0) {
          const rawNote = urlParams.get('note') || urlParams.get('merchant') || 'Discretionary Expense';
          const rawCategory = urlParams.get('category') || 'cat_uncategorized';
          const rawDate = urlParams.get('date') || new Date().toISOString().substring(0, 10);
          const paymentMethod = (urlParams.get('paymentMethod') as any) || 'card';

          // Match category
          const matchedCat = categories.find(c => c.id === rawCategory || c.name.toLowerCase() === rawCategory.toLowerCase()) || 
                             categories.find(c => c.id === 'cat_uncategorized') || 
                             categories[0];

          // Auto-Add Expense
          onAddExpense({
            amount,
            category: matchedCat.id,
            date: rawDate.includes('yesterday') ? extractDate('yesterday') : (rawDate.length === 10 ? rawDate : extractDate(rawDate)),
            note: rawNote,
            paymentMethod
          });

          // Clear query parameters from address bar
          window.history.replaceState({}, document.title, window.location.pathname);

          // Voice playback
          const targetDateStr = rawDate.includes('yesterday') ? extractDate('yesterday') : rawDate;
          const dateObj = new Date(targetDateStr + 'T12:00:00');
          const formattedDateSpeech = dateObj.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric'
          });

          const promptPhrase = `Transaction added for ${amount} ${currencySymbol === '$' ? 'dollars' : currencySymbol} to ${matchedCat.name} on ${formattedDateSpeech}. Do you want to add any more expenses?`;
          
          setAssistantMessage(promptPhrase);
          setTimeout(() => {
            speak(promptPhrase, () => {
              setIsEnabled(true);
              setVoiceState('awaiting_more');
            });
          }, 1200);
        }
      }
    } catch (e) {
      console.warn('Deep link voice trigger parsing initialization failed:', e);
    }
  }, [categories]);

  // Initialize Speech recognition safely on mount
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      console.log('SpeechRecognition started.');
      isListeningRef.current = true;
    };

    rec.onend = () => {
      isListeningRef.current = false;
      // Re-initialize if the assistant is manually enabled and we aren't talking right now
      if (isEnabledRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isEnabledRef.current && !isSpeakingRef.current && !isListeningRef.current) {
            try {
              rec.start();
            } catch (e) {
              console.warn('Recognition failed to auto-restart:', e);
            }
          }
        }, 150); // Fast restart delay for optimal responsiveness
      }
    };

    rec.onerror = (event: any) => {
      console.warn('Speech recognition status update:', event.error);
      if (event.error === 'not-allowed') {
        setIsEnabled(false);
        setVoiceState('idle');
        setAssistantMessage('Microphone permission denied. Enable microphone access in your browser settings.');
      } else if (event.error === 'audio-capture') {
        setIsEnabled(false);
        setVoiceState('idle');
        setAssistantMessage('No microphone detected. Please plug in a microphone.');
      }
    };

    rec.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      const cleaned = fullTranscript.trim();
      if (!cleaned) return;

      // Update transcript on screen instantly for natural visual feedback
      setUserTranscript(cleaned);

      // Reset sequence silence trigger
      if (speechDebouncerRef.current) {
        clearTimeout(speechDebouncerRef.current);
      }

      // Voice assistant will wait 3.2 seconds of complete silence before executing
      speechDebouncerRef.current = setTimeout(() => {
        if (processSpeechInputRef.current) {
          processSpeechInputRef.current(cleaned);
          // Gently stop/restart to clean up the browser Speech Engine accumulated buffer
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {}
          }
        }
      }, 3200);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch (e) {}
      if (speechDebouncerRef.current) {
        clearTimeout(speechDebouncerRef.current);
      }
    };
  }, []);

  // Handle speaker responses safely with automatic resumption
  const speak = (text: string, callback?: () => void) => {
    if (!('speechSynthesis' in window)) {
      if (callback) callback();
      return;
    }

    // Temporarily pause speech recognition to avoid hearing own output
    isSpeakingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Speak with a calm, patient, and slightly slower cadence
    utterance.rate = 0.85;
    
    // Attempt to load standard natural assistant voice
    const voices = window.speechSynthesis.getVoices();
    const desiredVoice = voices.find(v => v.name.includes('Google') || v.lang.startsWith('en')) || voices[0];
    if (desiredVoice) {
      utterance.voice = desiredVoice;
    }

    const resumeListening = () => {
      isSpeakingRef.current = false;
      if (isEnabledRef.current && recognitionRef.current && !isListeningRef.current) {
        setTimeout(() => {
          if (isEnabledRef.current && !isSpeakingRef.current && !isListeningRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.warn('Post-speak restart failed:', e);
            }
          }
        }, 200);
      }
    };

    utterance.onend = () => {
      if (callback) {
        callback();
      }
      resumeListening();
    };

    utterance.onerror = () => {
      if (callback) {
        callback();
      }
      resumeListening();
    };

    setVoiceState('speaking');
    window.speechSynthesis.speak(utterance);
  };

  // Convert transcripts to database expenses
  const handleParseAndAdd = (text: string) => {
    setVoiceState('processing');
    const amtInfo = extractAmount(text);
    if (!amtInfo) {
      speak("Sorry, I could not determine the amount. Please say the transaction amount again.", () => {
        setVoiceState('awaiting_more');
      });
      return false;
    }

    const { amount, matchedText } = amtInfo;
    const date = extractDate(text);
    const category = extractCategory(text, categories);
    const paymentMethod = extractPaymentMethod(text);
    const note = extractNote(text, matchedText, category.name);

    // Save transaction automatically
    onAddExpense({
      amount,
      category: category.id,
      date,
      note,
      paymentMethod
    });

    // Formatting date neatly for speech playback
    const dateObj = new Date(date + 'T12:00:00');
    const formattedDateSpeech = dateObj.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric'
    });

    const responsePhrase = `Transaction added for ${amount} ${currencySymbol === '$' ? 'dollars' : currencySymbol} to ${category.name} on ${formattedDateSpeech}.`;
    const promptPhrase = `${responsePhrase} Do you want to add any more expenses?`;
    
    setAssistantMessage(promptPhrase);
    setUserTranscript('');

    speak(promptPhrase, () => {
      setVoiceState('awaiting_more');
    });

    return true;
  };

  // Process live transcript
  const processSpeechInput = (transcript: string) => {
    const cleanTranscription = transcript.toLowerCase().trim();
    if (!cleanTranscription) return;

    setUserTranscript(transcript);

    if (voiceState === 'listening_hotword') {
      // 1. Look for wake words (including synonyms like "hey google", "google", "ok google", "alexa")
      const matchesWakeWord = /\b(?:hey google|google|ok google|add to expense)\b/i.test(cleanTranscription);
      if (matchesWakeWord) {
        // Extract command payload after wake word
        const payloadMatch = transcript.match(/\b(?:hey google|google|ok google|add to expense)\s*(.*)/i);
        const speechPayload = payloadMatch ? payloadMatch[1].trim() : '';

        if (speechPayload.length > 2) {
          handleParseAndAdd(speechPayload);
        } else {
          setVoiceState('processing');
          speak("Hi there! I am listening. What expense would you like to add?", () => {
            setVoiceState('awaiting_more');
          });
        }
      } else {
        // 2. Direct command input (no "Hey Google" required when app assistant is open & listening)
        const amtInfo = extractAmount(cleanTranscription);
        if (amtInfo) {
          handleParseAndAdd(transcript);
        } else {
          // If the text does not contain an amount, update the visual hint instead of speaking over the user.
          // This keeps the user control smooth and fluid.
          const isHelp = /\b(?:help|how to|what do i say)\b/i.test(cleanTranscription);
          if (isHelp) {
            setVoiceState('processing');
            speak("Try saying: coffee four dollars yesterday, or groceries twenty dollars.", () => {
              setVoiceState('listening_hotword');
            });
          } else {
            setAssistantMessage('I heard you, but couldn\'t detect an amount. E.g. say: "Coffee 4 dollars yesterday" or "Groceries 12.50".');
          }
        }
      }
    } else if (voiceState === 'awaiting_more') {
      // Conversational responses
      const isNoResponse = /\b(?:no|nope|nah|stop|cancel|thank you|thanks|that is all|that's all|nothing more)\b/i.test(cleanTranscription);
      if (isNoResponse) {
        speak("Alright, let me know if you need to track anything else!", () => {
          setVoiceState('listening_hotword');
          setAssistantMessage('Active. Speak a transaction directly (e.g. "Coffee 4 dollars yesterday") or say "Hey Google".');
        });
      } else {
        // Treat as a direct transaction description!
        handleParseAndAdd(transcript);
      }
    }
  };

  useEffect(() => {
    processSpeechInputRef.current = processSpeechInput;
  }, [processSpeechInput]);

  // Toggle toggle
  const handleToggle = () => {
    if (!isSupported) return;

    if (isEnabled) {
      setIsEnabled(false);
      setVoiceState('idle');
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      window.speechSynthesis?.cancel();
    } else {
      setIsEnabled(true);
      setVoiceState('listening_hotword');
      setAssistantMessage('Listening... Speak a transaction directly (e.g., "4 dollars on coffee yesterday") or say "Hey Google".');
      
      // We start recording instantly on manual click with zero blocking greeting audios
      setTimeout(() => {
        if (isEnabledRef.current && recognitionRef.current && !isListeningRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Manual start failed:', e);
          }
        }
      }, 50);
    }
  };

  return (
    <div id="hey_google_panel" className="bg-[#111111]/95 text-slate-200 border-t border-white/5 p-4 flex flex-col gap-3 rounded-t-3xl shadow-xl shrink-0 z-40 transition-all font-sans relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {isEnabled && (
              <span className="absolute inline-flex h-full w-full rounded-full animate-ping bg-emerald-500 opacity-30"></span>
            )}
            <span className={`relative inline-block w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5 leading-tight">
              <Bot size={13} className={isEnabled ? 'text-emerald-400' : 'text-gray-400'} />
              Hey Google Assistant
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isSupported 
                ? (isEnabled ? `Voice Active (${voiceState === 'awaiting_more' ? 'Awaiting replies' : 'Wake mode'})` : 'Voice Idle - Tap to Activate')
                : 'Offline Assistant not supported'
              }
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={!isSupported}
          className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full cursor-pointer transition-all border-0 outline-hidden focus:ring-2 ${
            isEnabled 
              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 focus:ring-emerald-500/20' 
              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 focus:ring-white/10'
          }`}
        >
          {isEnabled ? 'Mute' : 'Listen'}
        </button>
      </div>

      {isSupported ? (
        <div className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-1.5 transition-all text-[11px]">
          <div className="flex items-start gap-1.5">
            <Sparkles size={11} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-gray-300 italic tracking-wide leading-relaxed">
              {assistantMessage}
            </p>
          </div>

          {userTranscript && (
            <div className="border-t border-white/5 pt-1.5 mt-1.5 flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span className="text-slate-500 font-sans uppercase text-[9px] font-black shrink-0">Captured Speech:</span>
              <span className="text-emerald-400 truncate ml-2 font-black">"{userTranscript}"</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-rose-950/10 border border-rose-900/30 text-rose-300 p-2 text-[10px] flex items-start gap-1.5 rounded-lg leading-relaxed">
          <ShieldAlert size={14} className="shrink-0 mt-0.5 text-rose-400" />
          <span>Speech Recognition is missing or sandbox-restricted. Keep the app inside Chrome/Safari and make sure to allow Microphone access.</span>
        </div>
      )}

      {isEnabled && (
        <div className="text-[9px] text-zinc-500 text-center font-black uppercase tracking-widest leading-none mt-1 animate-pulse">
          Try: "Groceries 14 dollars" or "Hey Google, coffee 4 dollars yesterday"
        </div>
      )}
    </div>
  );
}
