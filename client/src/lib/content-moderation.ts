export interface ModerationResult {
  isViolation: boolean;
  violationType: string[];
  confidence: number;
  flaggedContent: string[];
  suggestions?: string[];
}

export interface PhoneNumberMatch {
  text: string;
  type: 'number' | 'spelled' | 'disguised';
  confidence: number;
  position: { start: number; end: number };
}

export interface ModerationConfig {
  strictMode: boolean;
  checkPhoneNumbers: boolean;
  checkInappropriateContent: boolean;
  checkSpam: boolean;
  customBlockedWords: string[];
}

export class ContentModerator {
  private config: ModerationConfig;
  
  // Phone number patterns
  private phonePatterns = {
    // Standard formats
    standard: [
      /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
      /\b\d{10}\b/g,
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g,
      /\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
    ],
    
    // International formats
    international: [
      /\+\d{1,3}[-.\s]?\d{4,14}/g,
      /00\d{1,3}[-.\s]?\d{4,14}/g,
    ],
    
    // Spelled out numbers
    spelled: [
      /(zero|one|two|three|four|five|six|seven|eight|nine|oh|o)/gi,
    ],
    
    // Disguised formats
    disguised: [
      /\b\d+[\s]*[-_.*#@!]+[\s]*\d+[\s]*[-_.*#@!]+[\s]*\d+/g,
      /\b\d+\s*(dot|dash|space|at)\s*\d+\s*(dot|dash|space|at)\s*\d+/gi,
    ]
  };

  // Inappropriate content categories
  private inappropriateContent = {
    // Sexual content
    sexual: [
      'explicit', 'nude', 'naked', 'sex', 'sexual', 'porn', 'xxx', 'adult',
      'hookup', 'dtf', 'fwb', 'nsa', 'casual', 'bedroom', 'intimate'
    ],
    
    // Offensive language
    offensive: [
      // Add common offensive words (sanitized for example)
      'hate', 'stupid', 'idiot', 'moron', 'loser', 'ugly', 'fat'
    ],
    
    // Harassment
    harassment: [
      'stalk', 'follow home', 'creep', 'obsessed', 'crazy', 'psycho',
      'bitch', 'slut', 'whore', 'kill yourself', 'die'
    ],
    
    // Spam indicators
    spam: [
      'buy now', 'click here', 'free money', 'get rich', 'work from home',
      'miracle cure', 'weight loss', 'viagra', 'bitcoin', 'investment'
    ],
    
    // Personal info requests
    personalInfo: [
      'address', 'home address', 'where do you live', 'phone number',
      'cell phone', 'mobile', 'whatsapp', 'telegram', 'snapchat',
      'instagram', 'facebook', 'social security', 'credit card'
    ]
  };

  // Suspicious patterns that might be phone numbers in disguise
  private suspiciousPatterns = [
    // Letters that look like numbers
    /[il1o0]/gi,
    // Excessive spacing or symbols between digits
    /\d[\s\-_.]{2,}\d/g,
    // Common substitutions
    /(for|four|to|too|two|ate|eight|won|one)/gi
  ];

  constructor(config: Partial<ModerationConfig> = {}) {
    this.config = {
      strictMode: false,
      checkPhoneNumbers: true,
      checkInappropriateContent: true,
      checkSpam: true,
      customBlockedWords: [],
      ...config
    };
  }

  // Main moderation function
  public moderateContent(text: string): ModerationResult {
    const violations: string[] = [];
    const flaggedContent: string[] = [];
    let maxConfidence = 0;

    // Check for phone numbers
    if (this.config.checkPhoneNumbers) {
      const phoneResult = this.detectPhoneNumbers(text);
      if (phoneResult.length > 0) {
        violations.push('phone_number');
        flaggedContent.push(...phoneResult.map(match => match.text));
        maxConfidence = Math.max(maxConfidence, Math.max(...phoneResult.map(m => m.confidence)));
      }
    }

    // Check for inappropriate content
    if (this.config.checkInappropriateContent) {
      const inappropriateResult = this.detectInappropriateContent(text);
      if (inappropriateResult.violations.length > 0) {
        violations.push(...inappropriateResult.violations);
        flaggedContent.push(...inappropriateResult.flaggedContent);
        maxConfidence = Math.max(maxConfidence, inappropriateResult.confidence);
      }
    }

    // Check for spam
    if (this.config.checkSpam) {
      const spamResult = this.detectSpam(text);
      if (spamResult.isSpam) {
        violations.push('spam');
        flaggedContent.push(...spamResult.flaggedContent);
        maxConfidence = Math.max(maxConfidence, spamResult.confidence);
      }
    }

    // Check custom blocked words
    const customResult = this.checkCustomBlockedWords(text);
    if (customResult.length > 0) {
      violations.push('custom_blocked');
      flaggedContent.push(...customResult);
      maxConfidence = Math.max(maxConfidence, 0.9);
    }

    return {
      isViolation: violations.length > 0,
      violationType: violations,
      confidence: maxConfidence,
      flaggedContent: [...new Set(flaggedContent)], // Remove duplicates
      suggestions: this.generateSuggestions(violations)
    };
  }

  // Detect phone numbers in text
  public detectPhoneNumbers(text: string): PhoneNumberMatch[] {
    const matches: PhoneNumberMatch[] = [];
    
    // Check standard phone patterns
    this.phonePatterns.standard.forEach(pattern => {
      const regexMatches = Array.from(text.matchAll(pattern));
      regexMatches.forEach(match => {
        if (match.index !== undefined) {
          matches.push({
            text: match[0],
            type: 'number',
            confidence: this.calculatePhoneConfidence(match[0]),
            position: { start: match.index, end: match.index + match[0].length }
          });
        }
      });
    });

    // Check international patterns
    this.phonePatterns.international.forEach(pattern => {
      const regexMatches = Array.from(text.matchAll(pattern));
      regexMatches.forEach(match => {
        if (match.index !== undefined) {
          matches.push({
            text: match[0],
            type: 'number',
            confidence: this.calculatePhoneConfidence(match[0]),
            position: { start: match.index, end: match.index + match[0].length }
          });
        }
      });
    });

    // Check for spelled out numbers
    const spelledMatches = this.detectSpelledPhoneNumbers(text);
    matches.push(...spelledMatches);

    // Check for disguised numbers
    const disguisedMatches = this.detectDisguisedPhoneNumbers(text);
    matches.push(...disguisedMatches);

    // Filter out low confidence matches unless in strict mode
    const confidenceThreshold = this.config.strictMode ? 0.3 : 0.6;
    return matches.filter(match => match.confidence >= confidenceThreshold);
  }

  // Detect spelled out phone numbers
  private detectSpelledPhoneNumbers(text: string): PhoneNumberMatch[] {
    const matches: PhoneNumberMatch[] = [];
    const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'oh', 'o'];
    
    // Look for sequences of number words
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length - 6; i++) {
      let sequence = '';
      let consecutiveNumbers = 0;
      
      for (let j = i; j < Math.min(i + 15, words.length); j++) {
        if (numberWords.includes(words[j])) {
          sequence += words[j] + ' ';
          consecutiveNumbers++;
        } else if (consecutiveNumbers >= 7) {
          // Found a potential phone number
          matches.push({
            text: sequence.trim(),
            type: 'spelled',
            confidence: Math.min(0.9, consecutiveNumbers / 10),
            position: { start: 0, end: 0 } // Approximate position
          });
          break;
        } else {
          break;
        }
      }
    }
    
    return matches;
  }

  // Detect disguised phone numbers
  private detectDisguisedPhoneNumbers(text: string): PhoneNumberMatch[] {
    const matches: PhoneNumberMatch[] = [];
    
    this.phonePatterns.disguised.forEach(pattern => {
      const regexMatches = Array.from(text.matchAll(pattern));
      regexMatches.forEach(match => {
        if (match.index !== undefined) {
          const confidence = this.calculateDisguisedPhoneConfidence(match[0]);
          if (confidence > 0.4) {
            matches.push({
              text: match[0],
              type: 'disguised',
              confidence,
              position: { start: match.index, end: match.index + match[0].length }
            });
          }
        }
      });
    });

    return matches;
  }

  // Calculate confidence for phone number matches
  private calculatePhoneConfidence(text: string): number {
    let confidence = 0.5;
    
    // Remove all non-digits to count
    const digits = text.replace(/\D/g, '');
    
    // Check digit count
    if (digits.length === 10) confidence += 0.3;
    else if (digits.length === 11 && digits[0] === '1') confidence += 0.3;
    else if (digits.length >= 7 && digits.length <= 15) confidence += 0.1;
    
    // Check for common formats
    if (/\(\d{3}\)/.test(text)) confidence += 0.2;
    if (/\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(text)) confidence += 0.2;
    if (/^\+/.test(text)) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // Calculate confidence for disguised phone numbers
  private calculateDisguisedPhoneConfidence(text: string): number {
    let confidence = 0.3;
    
    // Check for digit-like patterns
    const digitPattern = /\d/g;
    const digitCount = (text.match(digitPattern) || []).length;
    
    if (digitCount >= 7) confidence += 0.3;
    if (digitCount >= 10) confidence += 0.2;
    
    // Check for suspicious separators
    if (/[-_.*#@!]/.test(text)) confidence += 0.2;
    
    return Math.min(confidence, 0.9);
  }

  // Detect inappropriate content
  private detectInappropriateContent(text: string): {
    violations: string[];
    flaggedContent: string[];
    confidence: number;
  } {
    const violations: string[] = [];
    const flaggedContent: string[] = [];
    let maxConfidence = 0;
    
    const lowerText = text.toLowerCase();
    
    // Check each category
    Object.entries(this.inappropriateContent).forEach(([category, words]) => {
      words.forEach(word => {
        if (lowerText.includes(word.toLowerCase())) {
          violations.push(category);
          flaggedContent.push(word);
          maxConfidence = Math.max(maxConfidence, 0.8);
        }
      });
    });

    return {
      violations: [...new Set(violations)],
      flaggedContent: [...new Set(flaggedContent)],
      confidence: maxConfidence
    };
  }

  // Detect spam content
  private detectSpam(text: string): {
    isSpam: boolean;
    flaggedContent: string[];
    confidence: number;
  } {
    const flaggedContent: string[] = [];
    let spamScore = 0;
    
    const lowerText = text.toLowerCase();
    
    // Check for spam keywords
    this.inappropriateContent.spam.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) {
        flaggedContent.push(word);
        spamScore += 0.2;
      }
    });

    // Check for excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) spamScore += 0.3;

    // Check for excessive punctuation
    const punctRatio = (text.match(/[!?]{2,}/g) || []).length;
    if (punctRatio > 0) spamScore += 0.2;

    // Check for repeated words
    const words = text.split(/\s+/);
    const wordCounts = words.reduce((acc, word) => {
      acc[word.toLowerCase()] = (acc[word.toLowerCase()] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxRepeats = Math.max(...Object.values(wordCounts));
    if (maxRepeats > 3) spamScore += 0.2;

    return {
      isSpam: spamScore >= 0.6,
      flaggedContent,
      confidence: Math.min(spamScore, 1.0)
    };
  }

  // Check custom blocked words
  private checkCustomBlockedWords(text: string): string[] {
    const flagged: string[] = [];
    const lowerText = text.toLowerCase();
    
    this.config.customBlockedWords.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) {
        flagged.push(word);
      }
    });

    return flagged;
  }

  // Generate suggestions for fixing violations
  private generateSuggestions(violations: string[]): string[] {
    const suggestions: string[] = [];
    
    if (violations.includes('phone_number')) {
      suggestions.push('Remove phone numbers and use our secure messaging system instead');
      suggestions.push('Try our video calling feature for direct communication');
    }
    
    if (violations.includes('sexual')) {
      suggestions.push('Keep conversations respectful and appropriate');
      suggestions.push('Focus on getting to know each other first');
    }
    
    if (violations.includes('harassment')) {
      suggestions.push('Be respectful and considerate in your messages');
      suggestions.push('Treat others as you would like to be treated');
    }
    
    if (violations.includes('spam')) {
      suggestions.push('Write personalized messages instead of generic content');
      suggestions.push('Avoid excessive capitalization and punctuation');
    }

    return suggestions;
  }

  // Update configuration
  public updateConfig(newConfig: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Add custom blocked words
  public addBlockedWords(words: string[]): void {
    this.config.customBlockedWords.push(...words);
  }

  // Remove custom blocked words
  public removeBlockedWords(words: string[]): void {
    this.config.customBlockedWords = this.config.customBlockedWords.filter(
      word => !words.includes(word)
    );
  }

  // Get current configuration
  public getConfig(): ModerationConfig {
    return { ...this.config };
  }
}

// Export utility functions
export const quickPhoneCheck = (text: string): boolean => {
  const moderator = new ContentModerator({ strictMode: false, checkPhoneNumbers: true });
  const result = moderator.detectPhoneNumbers(text);
  return result.length > 0;
};

export const quickModerationCheck = (text: string): boolean => {
  const moderator = new ContentModerator();
  const result = moderator.moderateContent(text);
  return result.isViolation;
};

export const sanitizeText = (text: string): string => {
  const moderator = new ContentModerator();
  const result = moderator.moderateContent(text);
  
  if (!result.isViolation) {
    return text;
  }

  let sanitized = text;
  result.flaggedContent.forEach(flagged => {
    const regex = new RegExp(flagged.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    sanitized = sanitized.replace(regex, '*'.repeat(flagged.length));
  });

  return sanitized;
};

// Default moderator instance
export const defaultModerator = new ContentModerator();
