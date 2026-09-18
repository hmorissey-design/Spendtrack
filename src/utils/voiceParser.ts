/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, SavingsGoal } from '../types';
import { cleanVendorName, suggestCategoryForVendor } from './notificationParser';
import { LocalDb } from './db';

export interface ParsedVoiceExpense {
  amount?: number;
  vendor?: string;
  category?: string;
  note?: string;
  paymentMethod?: 'cash' | 'card';
  confidence: number;
  rawSpeech: string;
  learnedRuleMatched?: boolean;
}

/**
 * Converts English number words to digits if speech recognition returns words:
 * e.g. "twenty five dollars" -> "25 dollars", "fourteen fifty" -> "14.50"
 */
function normalizeSpokenNumbers(text: string): string {
  let s = text.toLowerCase();

  const wordsToNumbers: Record<string, string> = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
    'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
    'eighty': '80', 'ninety': '90', 'hundred': '100'
  };

  // Replace common compound expressions: e.g. "twenty five" -> "25", "fourteen fifty" -> "14.50"
  s = s.replace(/\btwenty\s+one\b/g, '21')
       .replace(/\btwenty\s+two\b/g, '22')
       .replace(/\btwenty\s+three\b/g, '23')
       .replace(/\btwenty\s+four\b/g, '24')
       .replace(/\btwenty\s+five\b/g, '25')
       .replace(/\btwenty\s+six\b/g, '26')
       .replace(/\btwenty\s+seven\b/g, '27')
       .replace(/\btwenty\s+eight\b/g, '28')
       .replace(/\btwenty\s+nine\b/g, '29')
       .replace(/\bthirty\s+five\b/g, '35')
       .replace(/\bforty\s+five\b/g, '45')
       .replace(/\bfifty\s+five\b/g, '55');

  // Handle single words
  for (const [word, num] of Object.entries(wordsToNumbers)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    s = s.replace(reg, num);
  }

  // Handle phrases like "14 and 50 cents" or "14 dollars and 50 cents" -> "14.50"
  s = s.replace(/(\d+)\s*(?:dollars?|bucks?)?\s*(?:and)?\s*(\d{1,2})\s*cents?/gi, '$1.$2');

  // Handle "14 50" -> "14.50"
  s = s.replace(/(\d+)\s+(\d{2})\b(?!\s*dollars|\s*cents)/gi, '$1.$2');

  return s;
}

/**
 * Parses spoken speech text into structured expense data.
 */
export function parseVoiceTransaction(
  speechText: string,
  categories: Category[],
  savingsGoals: SavingsGoal[] = []
): ParsedVoiceExpense {
  if (!speechText || !speechText.trim()) {
    return { confidence: 0, rawSpeech: '' };
  }

  const normalized = normalizeSpokenNumbers(speechText.trim());

  let amount: number | undefined = undefined;
  let vendor: string | undefined = undefined;
  let category: string | undefined = undefined;
  let paymentMethod: 'cash' | 'card' | undefined = undefined;

  // 1. Detect payment method
  if (/\b(?:cash|paper money|bills)\b/i.test(normalized)) {
    paymentMethod = 'cash';
  } else if (/\b(?:card|debit|credit|visa|mastercard|amex|apple pay|google pay)\b/i.test(normalized)) {
    paymentMethod = 'card';
  }

  // 2. Extract amount
  // Matches: $15.50, 15.50 dollars, 15 dollars, 15 bucks, spent 15, $15, etc.
  const amountPatterns = [
    /(?:\$|usd|cad|eur|gbp|€|£)\s*(\d+(?:[.,]\d{1,2})?)/i,
    /(\d+(?:[.,]\d{1,2})?)\s*(?:dollars?|bucks?|cents?|\$|usd|cad|eur|gbp|€|£)/i,
    /(?:spent|paid|cost|for|amount of)\s+(\d+(?:[.,]\d{1,2})?)/i,
    /\b(\d+\.\d{2})\b/,
    /\b(\d+(?:[.,]\d{1,2})?)\b/
  ];

  for (const pat of amountPatterns) {
    const match = normalized.match(pat);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val) && val > 0 && val < 1000000) {
        amount = val;
        break;
      }
    }
  }

  // 3. Extract vendor / payee
  // Patterns like:
  // "at Starbucks", "from Walmart", "to Shell", "for Gas at Costco"
  const vendorPatterns = [
    /\b(?:at|from|to)\s+([A-Za-z0-9\s'&.*#\-]+?)(?:\s+(?:for|using|with|on|in\s+cash|\$|\d)|$)/i,
    /\b(?:spent|paid)\s+(?:[\$\d\s\.,]+(?:dollars?|bucks?)?\s+)?(?:at|to|from)\s+([A-Za-z0-9\s'&.*#\-]+?)(?:\s+(?:for|using|with|on|in\s+cash)|$)/i,
    /(?:bought|purchased|got)\s+([A-Za-z0-9\s'&.*#\-]+?)\s+(?:at|from|for)\s+([A-Za-z0-9\s'&.*#\-]+)/i
  ];

  for (const pat of vendorPatterns) {
    const match = normalized.match(pat);
    if (match) {
      const candidate = match[2] || match[1];
      if (candidate && candidate.trim()) {
        const cleaned = cleanVendorName(candidate.trim());
        // Verify not just pure digits or filler words
        if (cleaned && !/^(cash|card|dollars?|bucks?)$/i.test(cleaned)) {
          vendor = cleaned;
          break;
        }
      }
    }
  }

  // If vendor wasn't matched via "at/to/from", check if user just said something like:
  // "Starbucks 15 dollars" or "Gas 40"
  if (!vendor && amount) {
    // Remove amount & currency from text
    let leftover = normalized
      .replace(/(?:\$|usd|cad|eur|gbp|€|£)\s*\d+(?:[.,]\d{1,2})?/gi, '')
      .replace(/\d+(?:[.,]\d{1,2})?\s*(?:dollars?|bucks?|\$)?/gi, '')
      .replace(/\b(?:spent|paid|bought|add|note|log|cost|expense|for|in|cash|card)\b/gi, '')
      .trim();

    if (leftover.length >= 2 && !/^\d+$/.test(leftover)) {
      vendor = cleanVendorName(leftover);
    }
  }

  // 4. Match Vendor & Category from Learned Rules First
  const learnedRules = LocalDb.getVendorRules();
  let matchedLearnedRule = vendor ? LocalDb.findVendorRule(vendor) : null;

  // If vendor wasn't cleanly extracted yet, search the entire spoken sentence for any known learned merchant!
  // e.g. User says "Spent $2 at the Superstore" -> learned rule "superstore" matches!
  if (!matchedLearnedRule && learnedRules.length > 0) {
    const cleanSpeech = normalized.toLowerCase().replace(/['’]/g, '');
    matchedLearnedRule = learnedRules.find(r => {
      const p = r.vendorPattern.toLowerCase().trim().replace(/^(?:the|at|a|an)\s+/i, '').replace(/['’]/g, '');
      return p.length >= 3 && cleanSpeech.includes(p);
    }) || null;

    if (matchedLearnedRule) {
      vendor = matchedLearnedRule.displayName || matchedLearnedRule.vendorPattern;
    }
  }

  let learnedRuleMatched = false;

  // PRIORITY 1: User's Previously Learned Vendor Rule
  if (matchedLearnedRule && categories.some(c => c.id === matchedLearnedRule.categoryId)) {
    category = matchedLearnedRule.categoryId;
    learnedRuleMatched = true;
    if (matchedLearnedRule.displayName && (!vendor || /^(voice|expense|transaction)/i.test(vendor))) {
      vendor = matchedLearnedRule.displayName;
    }
  } else {
    // PRIORITY 2: Check if speech mentions an existing category name directly
    const lowerSpeech = normalized.toLowerCase();
    const directCatMatch = categories.find(c => {
      const name = c.name.toLowerCase();
      return name.length > 2 && lowerSpeech.includes(name);
    });

    if (directCatMatch) {
      category = directCatMatch.id;
    } else if (vendor) {
      // PRIORITY 3: Built-in heuristics & dictionaries
      category = suggestCategoryForVendor(vendor, categories);
    } else {
      // PRIORITY 4: Fallback to default/uncategorized
      const uncategorized = categories.find(c => c.id === 'cat_uncategorized' || c.name.toLowerCase().includes('uncategorized'));
      category = uncategorized?.id || categories[0]?.id || 'cat_uncategorized';
    }
  }

  // 5. Confidence score
  let confidence = 0.3;
  if (amount) confidence += 0.4;
  if (vendor) confidence += 0.3;
  if (learnedRuleMatched) confidence = 0.98;

  return {
    amount,
    vendor: vendor || (speechText.trim().length < 25 ? speechText.trim() : 'Voice Transaction'),
    category,
    note: speechText.trim(),
    paymentMethod: paymentMethod || 'card',
    confidence,
    rawSpeech: speechText.trim(),
    learnedRuleMatched
  };
}
