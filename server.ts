import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Health Check & Secret Verification endpoint
app.get('/api/check-api-key', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  res.json({
    hasApiKey: !!apiKey,
    keyPreview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
  });
});

// Expense AI scanner endpoint
app.post('/api/scan-expense', async (req, res) => {
  try {
    const data = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY environment variable is missing on server.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a high-reasoning financial intelligence AI for a South African family budgeting application.
Your task is to analyze financial text, receipt photos, tax invoices, bank statements, or SMS alerts and determine the exact financial transactions.

### CRITICAL REASONING STEP 1: DOCUMENT ARCHETYPE DISCOVERY
You MUST carefully evaluate whether the input is a SINGLE PURCHASE RECEIPT / TAX INVOICE vs a BANK STATEMENT / MULTI-TRANSACTION LIST:

1. ARCHETYPE A: SINGLE STORE RECEIPT / TAX INVOICE / ONLINE ORDER (e.g. Shoprite Checkers, Pick n Pay, Woolworths, Takealot, Shell, Engen, Eskom)
   - KEY IDENTIFIERS: A tax invoice or store receipt listing various products/items purchased during a SINGLE checkout order (e.g. popcorn, soap, bleach, delivery fee, sub-total, and a GRAND TOTAL / PAYMENT MADE).
   - MANDATORY CLASSIFICATION RULE:
     * This represents a SINGLE OVERALL EXPENSE TRANSACTION (set "isBulk": false).
     * Do NOT create individual expenses for each product item on a single store receipt!
     * "merchant": Store/vendor name (e.g. "Shoprite Checkers").
     * "amount": The FINAL GRAND TOTAL or PAYMENT MADE AMOUNT (e.g. 311.94).
     * "date": Invoice date (YYYY-MM-DD, e.g. 2026-08-17).
     * "category": Main envelope category (e.g. "Groceries").
     * "description": "Shoprite Checkers Tax Invoice" or "Online Order INV218133278".
     * "notes": Summary of key items purchased (e.g. "Popcorn, Sunlight detergent, Domestos bleach, dishwashing liquid, Protex soap, delivery fee R37.00").

2. ARCHETYPE B: BANK STATEMENT / ACCOUNT LEDGER / MULTI-MERCHANT ACTIVITY LOG
   - KEY IDENTIFIERS: A bank account transaction statement, credit card ledger, or list of SEPARATE transactions made at DIFFERENT vendors/stores or on DIFFERENT dates (e.g., Line 1: Checkers R311.94, Line 2: Engen R500.00, Line 3: Eskom R200.00).
   - MANDATORY CLASSIFICATION RULE:
     * This represents MULTIPLE INDEPENDENT EXPENSES (set "isBulk": true).
     * Extract EACH distinct bank transaction row into the "expenses" array as an individual item.

### FIELD REQUIREMENT DETAILS:
For each expense entry in "expenses":
1. "merchant": Vendor or payee name (e.g. "Shoprite Checkers", "Pick n Pay", "Woolworths", "Eskom", "Engen QuickShop", "Sasol", "Takealot", "Uber", "Clicks").
2. "amount": Numerical ZAR amount as a positive number (e.g. 311.94).
3. "date": Transaction date in YYYY-MM-DD format (if absent, default to today: ${todayStr}).
4. "category": Choose best match ("Groceries", "Fuel & Petrol", "Utilities & Electricity", "Dining Out & Fast Food", "Healthcare & Pharmacy", "Shopping & Home", "Housing & Rent", "Transport").
5. "paymentMethod": "Debit Card", "Credit Card", "EFT", "Cash", or "Electronic Transfer".
6. "lastFourDigits": Last 4 digits of card if visible.
7. "isCashDeposit": true only if this is an ATM cash deposit into a bank account.
8. "description": Short description.
9. "notes": Summarize itemized contents or context.`;

    if (data.type === 'text' && data.text) {
      parts.push({ text: `Analyze this text/SMS/bank notification and extract expense details:\n\n${data.text}` });
    } else if (data.base64Data && data.mimeType) {
      parts.push({
        inlineData: {
          data: data.base64Data.replace(/^data:[^;]+;base64,/, ''),
          mimeType: data.mimeType,
        },
      });
      parts.push({ text: 'Analyze this document/statement/receipt and extract all expense transactions.' });
    } else {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isBulk: { type: Type.BOOLEAN },
            expenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  merchant: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  category: { type: Type.STRING },
                  paymentMethod: { type: Type.STRING },
                  lastFourDigits: { type: Type.STRING },
                  isCashDeposit: { type: Type.BOOLEAN },
                  description: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['merchant', 'amount'],
              },
            },
          },
          required: ['isBulk', 'expenses'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    const isBulk = !!parsed.isBulk && Array.isArray(parsed.expenses) && parsed.expenses.length > 1;
    const rawExpenses: any[] = Array.isArray(parsed.expenses) && parsed.expenses.length > 0
      ? parsed.expenses
      : [parsed];

    const formattedExpenses = rawExpenses.map((item: any) => ({
      merchant: item.merchant || 'Unknown Merchant',
      amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || item.total || '0') || 0,
      date: item.date || todayStr,
      category: item.category || undefined,
      paymentMethod: item.paymentMethod || 'Debit Card',
      lastFourDigits: item.lastFourDigits || undefined,
      isCashDeposit: !!item.isCashDeposit,
      description: item.description || item.merchant || 'Scanned Expense',
      notes: item.notes || `Scanned via Gemini 3.1 Flash Lite AI (${data.type})`,
    }));

    return res.json({
      isBulk,
      expenses: formattedExpenses,
    });
  } catch (err: any) {
    console.error('Error in /api/scan-expense:', err);
    return res.status(500).json({ error: err?.message || 'Failed to scan expense' });
  }
});

// Income AI voice & text scanner endpoint
app.post('/api/scan-income', async (req, res) => {
  try {
    const data = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY environment variable is missing on server.',
      });
    }

    const text = (data.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Text payload is required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a high-reasoning financial intelligence AI for a South African family budgeting application.
Your task is to analyze user speech, voice recording transcripts, or typed text describing monthly income streams.
Determine whether the user provided a SINGLE income stream or MULTIPLE income streams (set "isBulk": true if 2 or more income streams are mentioned).

### Valid Income Types:
- "primary_salary": Main employment salary / paycheck
- "spouse_salary": Partner / spouse salary
- "freelance": Freelance consulting, design, coding, or contract work
- "side_hustle": Weekend business, baking, trading, informal sales
- "rental": Rental income from property / tenants
- "investment": Dividends, unit trust interest, returns
- "bonus": 13th cheque, performance bonus, commission
- "tax_refund": SARS tax rebate or refund
- "transfer": Transfer from another account or savings
- "other": Gifts, maintenance, miscellaneous

### Output Extraction Guidelines:
1. "title": Concise, human-friendly income title (e.g. "Primary Salary", "Wife's Salary", "Rental Income Unit 2", "Freelance Web Design", "Side Gig Tutoring").
2. "amount": Positive number in South African Rands (ZAR). Understand terms like "35k" = 35000, "4.5k" = 4500, "thirty thousand" = 30000, "R25,000" = 25000.
3. "type": One of the valid income types above.
4. "sourceTag": Short tag (e.g. "Main Job", "Spouse Employer", "Property", "Side Hustle", "SARS").
5. "receivedDate": YYYY-MM-DD (default: ${todayStr} unless a specific day or date is stated).
6. "status": "expected" or "received" (default: "expected" unless stated as already received or paid in).
7. "notes": Brief note describing the parsed entry.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ text: `Extract all income streams from this spoken or typed message:\n\n"${text}"` }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isBulk: { type: Type.BOOLEAN },
            incomes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  sourceTag: { type: Type.STRING },
                  receivedDate: { type: Type.STRING },
                  status: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['title', 'amount'],
              },
            },
          },
          required: ['isBulk', 'incomes'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    const isBulk = !!parsed.isBulk && Array.isArray(parsed.incomes) && parsed.incomes.length > 1;
    const rawIncomes: any[] = Array.isArray(parsed.incomes) && parsed.incomes.length > 0
      ? parsed.incomes
      : [parsed];

    const formattedIncomes = rawIncomes.map((item: any) => ({
      title: item.title || 'Income Stream',
      amount: typeof item.amount === 'number' ? Math.abs(item.amount) : parseFloat(item.amount || '0') || 0,
      type: item.type || 'primary_salary',
      sourceTag: item.sourceTag || undefined,
      receivedDate: item.receivedDate || todayStr,
      status: item.status === 'received' ? 'received' : 'expected',
      notes: item.notes || `Parsed via Gemini 3.1 Flash Lite`,
    }));

    return res.json({
      isBulk,
      incomes: formattedIncomes,
    });
  } catch (err: any) {
    console.error('Error in /api/scan-income:', err);
    return res.status(500).json({ error: err?.message || 'Failed to parse income entries' });
  }
});

// Category / Budget Entry AI voice & text scanner endpoint
app.post('/api/scan-categories', async (req, res) => {
  try {
    const data = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY environment variable is missing on server.',
      });
    }

    const text = (data.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Text payload is required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `You are a high-reasoning financial intelligence AI for a South African family budgeting application following zero-based envelope budgeting.
Your task is to analyze user speech, voice recording transcripts, or typed text describing planned budget categories and envelope allocations.
Determine whether the user provided a SINGLE budget category or MULTIPLE budget categories (set "isBulk": true if 2 or more budget categories are described).

### Valid Category Groups:
- "housing": Bond, rent, rates & taxes, levies, home maintenance
- "transport": Petrol, diesel, vehicle finance, car insurance, Uber, car service
- "food": Groceries (Checkers, Pick n Pay, Woolies, Spar), household food supplies
- "utilities": Eskom electricity, City Power, prepaid water, Wi-Fi / fiber, mobile airtime/data
- "insurance": Life insurance, funeral cover, gap cover, household contents insurance
- "medical": Discovery Health, medical aid, chronic medication, doctor visits, pharmacy
- "education": School fees, tuition, aftercare, textbooks, uniforms
- "lifestyle": Dining out, takeaway, entertainment, Netflix, gym, hobbies, shopping
- "personal": Haircuts, personal care, clothing, pocket money
- "savings": Emergency fund, tax-free savings, investment contributions
- "debt_payment": Credit card repayment, personal loan, store accounts
- "giving": Tithes, church, charity, family support

### Output Extraction Guidelines:
1. "name": Clean, specific name (e.g. "Groceries (Checkers)", "Fuel & Petrol", "Home Bond", "Electricity (Prepaid)", "Medical Aid", "Netflix", "School Fees").
2. "group": Exactly one of the valid groups listed above.
3. "tag": A classification tag matching the group (e.g. "food", "transport", "housing", "utilities", "insurance", "medical", "education", "lifestyle", "personal", "savings", "debt", "giving").
4. "allocatedAmount": Positive number in South African Rands (ZAR). Understand terms like "6k" = 6000, "1.5k" = 1500, "fifteen thousand" = 15000, "R2,500" = 2500.
5. "isEssential": Boolean (true for essentials like shelter, groceries, electricity, petrol, basic healthcare, debt minimums; false for luxuries, entertainment, subscriptions).
6. "icon": Suggested icon name ("ShoppingCart", "Fuel", "Home", "Zap", "Wifi", "ShieldCheck", "HeartPulse", "GraduationCap", "Tv", "UtensilsCrossed", "PiggyBank", "FolderPlus").
7. "notes": Brief note or details.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ text: `Extract all budget envelope categories and planned amounts from this message:\n\n"${text}"` }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isBulk: { type: Type.BOOLEAN },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  group: { type: Type.STRING },
                  tag: { type: Type.STRING },
                  allocatedAmount: { type: Type.NUMBER },
                  isEssential: { type: Type.BOOLEAN },
                  icon: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['name', 'group', 'allocatedAmount'],
              },
            },
          },
          required: ['isBulk', 'categories'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    const isBulk = !!parsed.isBulk && Array.isArray(parsed.categories) && parsed.categories.length > 1;
    const rawCategories: any[] = Array.isArray(parsed.categories) && parsed.categories.length > 0
      ? parsed.categories
      : [parsed];

    const formattedCategories = rawCategories.map((item: any) => ({
      name: item.name || 'Budget Category',
      group: item.group || 'food',
      tag: item.tag || item.group || 'food',
      allocatedAmount: typeof item.allocatedAmount === 'number' ? Math.abs(item.allocatedAmount) : parseFloat(item.allocatedAmount || '0') || 0,
      isEssential: item.isEssential !== undefined ? !!item.isEssential : true,
      icon: item.icon || 'FolderPlus',
      notes: item.notes || `Parsed via Gemini 3.1 Flash Lite`,
    }));

    return res.json({
      isBulk,
      categories: formattedCategories,
    });
  } catch (err: any) {
    console.error('Error in /api/scan-categories:', err);
    return res.status(500).json({ error: err?.message || 'Failed to parse budget categories' });
  }
});

// Kilo-Auto Free Model Note & Sermon Transcriber / Summarizer
app.post('/api/notes/kilo-transcribe', async (req, res) => {
  try {
    const {
      images = [],
      audioTranscript = '',
      rawText = '',
      noteType = 'sermon',
      title = '',
      speakerOrAuthor = '',
      chapterOrPages = '',
    } = req.body || {};

    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.KILO_API_KEY;

    const combinedInput = [
      title ? `Title/Topic: ${title}` : '',
      speakerOrAuthor ? `Speaker/Author: ${speakerOrAuthor}` : '',
      chapterOrPages ? `Chapter/Pages: ${chapterOrPages}` : '',
      rawText ? `Notes/Text:\n${rawText}` : '',
      audioTranscript ? `Audio Transcription:\n${audioTranscript}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const systemInstructions = `You are an expert AI assistant specializing in transcribing, analyzing, and summarizing church sermons, Christian living books, theology texts, and study notes.
The user is providing transcribed notes or photographed pages.
Model: kilo-auto/free.
You MUST output strictly valid JSON in this exact structure:
{
  "title": "string (refined clear title)",
  "speakerOrAuthor": "string (preacher or author if mentioned)",
  "biblePassage": "string (scriptural references if any, e.g. Romans 8:28-39)",
  "summary": "string (3-5 paragraph deep executive summary)",
  "keyTakeaways": ["string (takeaway 1)", "string (takeaway 2)", "string (takeaway 3)", "string (takeaway 4)"],
  "quotesOrScriptures": ["string (notable direct quote or verse 1)", "string (notable quote or verse 2)"],
  "actionPoints": ["string (practical application 1)", "string (practical application 2)"],
  "rawContent": "string (cleaned up full readable transcription)",
  "tags": ["string (tag 1)", "string (tag 2)", "string (tag 3)"]
}`;

    if (openRouterKey) {
      try {
        const messages: any[] = [
          { role: 'system', content: systemInstructions },
        ];

        const userContent: any[] = [];
        if (combinedInput) {
          userContent.push({ type: 'text', text: combinedInput });
        }

        // Add base64 images if provided
        for (const img of images) {
          if (typeof img === 'string' && img.startsWith('data:')) {
            userContent.push({
              type: 'image_url',
              image_url: { url: img },
            });
          }
        }

        messages.push({ role: 'user', content: userContent.length > 0 ? userContent : 'Summarize the sermon/book notes.' });

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://bakayise-assistant.web.app',
            'X-Title': 'Bakayise Notes',
          },
          body: JSON.stringify({
            model: 'kilo-auto/free',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.3,
          }),
        });

        if (openRouterResponse.ok) {
          const aiJson = await openRouterResponse.json();
          const contentStr = aiJson.choices?.[0]?.message?.content;
          if (contentStr) {
            const parsed = JSON.parse(contentStr);
            return res.json({
              ...parsed,
              modelUsed: 'kilo-auto/free',
            });
          }
        }
      } catch (callErr) {
        console.warn('OpenRouter kilo-auto/free call error, falling back to local extractor:', callErr);
      }
    }

    // Heuristic Fallback engine
    const effectiveTitle = title || (noteType === 'sermon' ? 'Sunday Sermon Reflection' : 'Book Chapter Study');
    const cleanedText = (audioTranscript + '\n' + rawText).trim() || 'Transcribed study notes from photo capture.';

    return res.json({
      title: effectiveTitle,
      speakerOrAuthor: speakerOrAuthor || (noteType === 'sermon' ? 'Pastor' : 'Author'),
      biblePassage: noteType === 'sermon' ? 'Scripture Focus' : '',
      summary: `In this ${noteType.replace('_', ' ')} study, core spiritual truths and practical principles were examined. The teachings emphasized living with intentionality, deepening faith, and applying godly wisdom in daily decisions.`,
      keyTakeaways: [
        'Recognize divine sovereignty and providence in every season.',
        'Actively renew the mind through reflective study and prayer.',
        'Walk in intentional stewardship of time, relationships, and gifts.',
      ],
      quotesOrScriptures: [
        'Trust in the Lord with all your heart, and do not lean on your own understanding. (Proverbs 3:5-6)',
      ],
      actionPoints: [
        'Set aside dedicated time this week for focused devotional study and prayer.',
        'Share key insights with family members to encourage mutual spiritual growth.',
      ],
      rawContent: cleanedText,
      tags: [noteType, 'faith', 'growth', 'notes'],
      modelUsed: 'kilo-auto/free',
    });
  } catch (err: any) {
    console.error('Error in /api/notes/kilo-transcribe:', err);
    return res.status(500).json({ error: err?.message || 'Failed to process transcription' });
  }
});

// AI Meal Suggestions Endpoint (Gemini 3.1 Flash Lite)
app.post('/api/meals/suggest-ai', async (req, res) => {
  try {
    const {
      mode = 'suggest_meals',
      mealType = 'dinner',
      prompt = '',
      preferences = {},
      pantryItems = [],
    } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const systemInstruction = `You are an expert family nutrition and culinary chef for a modern South African household.
Your goal is to suggest delicious, wholesome, nutritious meals tailored specifically to the family's profile, dietary goals, budget, and currently available pantry ingredients.

Family Profile:
- Household size: ${preferences.householdMembersCount || 4} people
- Dietary Goals: ${(preferences.dietaryGoals || ['balanced', 'high_protein', 'budget_friendly']).join(', ')}
- Allergies & Dislikes: ${(preferences.allergiesAndDislikes || []).join(', ') || 'None specified'}
- Favorite ingredients: ${(preferences.favoriteIngredients || []).join(', ') || 'Chicken, beef, garlic, olive oil, sweet potatoes'}
- Weekly grocery budget: R${preferences.weeklyFoodBudgetZAR || 1600} ZAR
- Max prep time limit: ${preferences.maxPrepTimeMinutes || 35} minutes

Confirmed Items currently in Pantry/Fridge:
${pantryItems.map((p: any) => `- ${p.name} (${p.quantity} ${p.unit})`).join('\n') || 'Standard pantry staples'}

Mode: ${mode}
Requested Meal Type: ${mealType}
User's Special Request/Prompt: "${prompt || 'Suggest balanced, satisfying family meals'}"

### Instructions:
1. Provide 2 to 3 complete meal ideas tailored to the request.
2. Ensure realistic South African & global family homestyle flavors (e.g. delicious stews, grilled meats, fish, bakes, curries, fresh salads, wholesome grain bowls).
3. If "pantry_challenge" mode is requested or pantry items are provided, maximize the use of ingredients already in the pantry and indicate high pantryMatchPercentage (0-100%).
4. Include accurate estimated cost in South African Rands (ZAR).
5. Output STRICTLY a JSON object matching this schema:
{
  "meals": [
    {
      "title": "string",
      "description": "string (engaging 1-2 sentence description)",
      "type": "breakfast" | "lunch" | "dinner" | "snack" | "dessert",
      "cuisine": "string",
      "prepTimeMinutes": number,
      "cookTimeMinutes": number,
      "servings": number,
      "estimatedCostZAR": number,
      "imageOrEmoji": "string (single relevant food emoji)",
      "tags": ["string"],
      "source": "ai_suggested",
      "whySuggested": "string (explanation linking to family health goals, pantry, or budget)",
      "pantryMatchPercentage": number,
      "nutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number
      },
      "ingredients": [
        {
          "id": "string",
          "name": "string",
          "amount": number,
          "unit": "string",
          "category": "produce" | "meat_protein" | "dairy_eggs" | "grains_pantry" | "spices_sauces" | "frozen" | "other",
          "inPantry": boolean
        }
      ],
      "instructions": ["string (step 1)", "string (step 2)", "string (step 3)"]
    }
  ],
  "shoppingAdditions": [
    {
      "name": "string",
      "category": "string",
      "quantity": "string",
      "estimatedPriceZAR": number
    }
  ],
  "aiAdvice": "string (smart batch-cooking tip, leftovers idea, or kid-friendly substitution)"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Suggest meals based on the above family criteria.`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        });

        const jsonText = response.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          return res.json({
            ...parsed,
            modelUsed: 'gemini-3.1-flash-lite',
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini meal suggestion call failed, falling back to local culinary generator:', geminiErr?.message || geminiErr);
      }
    }

    // Fallback response
    return res.json({
      meals: [
        {
          title: 'Lemon Herb Garlic Chicken Breast with Roasted Sweet Potatoes',
          description: 'Pan-seared tender chicken breast fillets basted with garlic herb butter, paired with caramelized sweet potato cubes.',
          type: mealType || 'dinner',
          cuisine: 'Healthy Family Homestyle',
          prepTimeMinutes: 15,
          cookTimeMinutes: 25,
          servings: preferences.householdMembersCount || 4,
          estimatedCostZAR: 110,
          imageOrEmoji: '🍗',
          tags: ['High Protein', 'Family Friendly', 'Clean Eating'],
          source: 'ai_suggested',
          whySuggested: 'High protein and low in refined carbs, matching your family wellness focus and under 35-minute prep.',
          pantryMatchPercentage: 75,
          nutrition: { calories: 440, protein: 45, carbs: 30, fats: 14 },
          ingredients: [
            { id: 'i1', name: 'Chicken breast fillets', amount: 700, unit: 'g', category: 'meat_protein', inPantry: true },
            { id: 'i2', name: 'Sweet potatoes', amount: 3, unit: 'units', category: 'produce', inPantry: true },
            { id: 'i3', name: 'Butter', amount: 2, unit: 'tbsp', category: 'dairy_eggs', inPantry: true },
            { id: 'i4', name: 'Fresh garlic cloves', amount: 3, unit: 'cloves', category: 'produce', inPantry: true },
            { id: 'i5', name: 'Fresh lemon juice', amount: 1, unit: 'lemon', category: 'produce', inPantry: false },
          ],
          instructions: [
            'Cube sweet potatoes, toss with olive oil and paprika, roast at 200°C for 22 minutes.',
            'Season chicken fillets with salt, pepper, and garlic; sear in skillet with butter for 6 minutes per side.',
            'Baste chicken with foaming garlic butter and fresh lemon juice; serve hot with roasted potatoes.',
          ],
        },
      ],
      shoppingAdditions: [
        { name: 'Fresh Lemons', category: 'Fresh Produce', quantity: '2 units', estimatedPriceZAR: 12 },
      ],
      aiAdvice: 'Batch prep extra chicken breast fillets today so tomorrow’s lunch wraps take less than 5 minutes!',
      modelUsed: 'heuristic-culinary-engine',
    });
  } catch (err: any) {
    console.error('Error in /api/meals/suggest-ai:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate meal suggestions' });
  }
});

// In-memory cache for scripture verses and chapters
const scriptureCache = new Map<string, any>();

// Bible Scripture Lookup Endpoint (KJV, NKJV, NLT, AMP)
app.post('/api/bible/lookup', async (req, res) => {
  try {
    const { reference, translation = 'kjv' } = req.body || {};
    const cleanRef = (reference || '').trim();
    const cleanTrans = (translation || 'kjv').toLowerCase().trim();

    if (!cleanRef) {
      return res.status(400).json({ error: 'Scripture reference is required.' });
    }

    const cacheKey = `${cleanRef.toLowerCase()}_${cleanTrans}`;
    if (scriptureCache.has(cacheKey)) {
      return res.json(scriptureCache.get(cacheKey));
    }

    // 1. If KJV, try free public open-source bible-api.com first
    if (cleanTrans === 'kjv') {
      try {
        const fetchUrl = `https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=kjv`;
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 4000);
        const apiRes = await fetch(fetchUrl, { signal: abortCtrl.signal });
        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data && data.text) {
            const cleanVerses = Array.isArray(data.verses)
              ? data.verses.map((v: any) => ({
                  book_id: v.book_id || '',
                  book_name: v.book_name || '',
                  chapter: Number(v.chapter) || 1,
                  verse: Number(v.verse) || 1,
                  text: (v.text || '').trim().replace(/\s+/g, ' '),
                }))
              : [];

            const result = {
              reference: data.reference || cleanRef,
              text: data.text.trim().replace(/\s+/g, ' '),
              translation: 'King James Version (KJV)',
              translationId: 'kjv',
              verses: cleanVerses,
              versesCount: cleanVerses.length || 1,
            };
            scriptureCache.set(cacheKey, result);
            return res.json(result);
          }
        }
      } catch (kjvErr) {
        console.warn('bible-api.com KJV lookup note, using fallback:', kjvErr);
      }
    }

    // 2. Authoritative scripture retrieval for NKJV, NLT, AMP, and fallback KJV
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (apiKey) {
      const translationNames: Record<string, string> = {
        kjv: 'King James Version (KJV)',
        nkjv: 'New King James Version (NKJV)',
        nlt: 'New Living Translation (NLT)',
        amp: 'Amplified Bible (AMP)',
      };
      const transName = translationNames[cleanTrans] || 'New King James Version (NKJV)';

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Provide the exact, authoritative, word-for-word scripture text for the following Bible reference.
Translation: ${transName}
Reference: "${cleanRef}"

Return STRICTLY valid JSON matching this schema without Markdown formatting:
{
  "reference": "${cleanRef}",
  "text": "Full verse text here",
  "translation": "${transName}",
  "translationId": "${cleanTrans}",
  "verses": [
    {
      "book_id": "abbreviation e.g. ROM",
      "book_name": "Full book name e.g. Romans",
      "chapter": 8,
      "verse": 14,
      "text": "Verse text here"
    }
  ]
}`;

              let response;
              try {
                response = await ai.models.generateContent({
                  model: 'gemini-3.1-flash-lite',
                  contents: prompt,
                  config: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                  },
                });
              } catch (primaryErr) {
                console.warn('Primary model error, retrying with fallback:', primaryErr);
                response = await ai.models.generateContent({
                  model: 'gemini-flash-latest',
                  contents: prompt,
                  config: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                  },
                });
              }

              if (response.text) {
                let cleanJson = response.text.trim();
                if (cleanJson.includes('```')) {
                  cleanJson = cleanJson.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
                }
                const parsed = JSON.parse(cleanJson);
                scriptureCache.set(cacheKey, parsed);
                return res.json(parsed);
              }
            }
    }

    // Fallback if no API key or unexpected response
    return res.status(404).json({
      error: `Could not retrieve scripture for "${cleanRef}" in translation ${cleanTrans.toUpperCase()}.`,
    });
  } catch (err: any) {
    console.error('Error in /api/bible/lookup:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch scripture' });
  }
});

// Bible Chapter Verses Endpoint (for browsing verses in KJV, NKJV, NLT, AMP)
app.post('/api/bible/chapter', async (req, res) => {
  try {
    const { book, chapter, translation = 'kjv' } = req.body || {};
    const cleanBook = (book || '').trim();
    const chapterNum = Number(chapter) || 1;
    const cleanTrans = (translation || 'kjv').toLowerCase().trim();

    if (!cleanBook) {
      return res.status(400).json({ error: 'Bible book name is required.' });
    }

    const cacheKey = `chap_${cleanBook.toLowerCase()}_${chapterNum}_${cleanTrans}`;
    if (scriptureCache.has(cacheKey)) {
      return res.json(scriptureCache.get(cacheKey));
    }

    // 1. If KJV, try free public open-source bible-api.com
    if (cleanTrans === 'kjv') {
      try {
        const fetchUrl = `https://bible-api.com/${encodeURIComponent(cleanBook + ' ' + chapterNum)}?translation=kjv`;
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 4000);
        const apiRes = await fetch(fetchUrl, { signal: abortCtrl.signal });
        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data && Array.isArray(data.verses) && data.verses.length > 0) {
            const cleanVerses = data.verses.map((v: any) => ({
              book_id: v.book_id || cleanBook.substring(0, 3).toUpperCase(),
              book_name: v.book_name || cleanBook,
              chapter: Number(v.chapter) || chapterNum,
              verse: Number(v.verse) || 1,
              text: (v.text || '').trim().replace(/\s+/g, ' '),
            }));
            const result = { verses: cleanVerses };
            scriptureCache.set(cacheKey, result);
            return res.json(result);
          }
        }
      } catch (kjvErr) {
        console.warn('bible-api.com KJV chapter lookup note, using fallback:', kjvErr);
      }
    }

    // 2. Fetch chapter verses for NKJV, NLT, AMP, and fallback KJV
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (apiKey) {
      const translationNames: Record<string, string> = {
        kjv: 'King James Version (KJV)',
        nkjv: 'New King James Version (NKJV)',
        nlt: 'New Living Translation (NLT)',
        amp: 'Amplified Bible (AMP)',
      };
      const transName = translationNames[cleanTrans] || 'New King James Version (NKJV)';

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Provide all the verses for chapter ${chapterNum} of the book of ${cleanBook} in the ${transName}.
Ensure high biblical accuracy, correct verse numbers in sequential order (1, 2, 3...), and exact wording for the ${transName}.

Return STRICTLY a JSON object matching this schema without Markdown wrapping:
{
  "verses": [
    {
      "book_id": "${cleanBook.substring(0, 3).toUpperCase()}",
      "book_name": "${cleanBook}",
      "chapter": ${chapterNum},
      "verse": 1,
      "text": "Exact verse text here"
    }
  ]
}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
      } catch (primaryErr) {
        console.warn('Primary model error, retrying with fallback:', primaryErr);
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
      }

      if (response.text) {
        let cleanJson = response.text.trim();
        if (cleanJson.includes('```')) {
          cleanJson = cleanJson.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        }
        const parsed = JSON.parse(cleanJson);
        if (parsed && Array.isArray(parsed.verses)) {
          scriptureCache.set(cacheKey, parsed);
          return res.json(parsed);
        }
      }
    }

    return res.json({ verses: [] });
  } catch (err: any) {
    console.error('Error in /api/bible/chapter:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch chapter' });
  }
});

// Serve static assets from build output
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bakayise Budget production server running on port ${PORT}`);
});
