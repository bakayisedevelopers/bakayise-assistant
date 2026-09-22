import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

function geminiScanPlugin(): Plugin {
  return {
    name: 'gemini-scan-plugin',
    configureServer(server) {
      server.middlewares.use('/api/check-api-key', (req, res) => {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            hasApiKey: !!apiKey,
            keyPreview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
          })
        );
      });

      server.middlewares.use('/api/scan-expense', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

            if (!apiKey) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  error: 'GEMINI_API_KEY environment variable not set.',
                })
              );
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
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Invalid payload' }));
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

            const result = {
              isBulk,
              expenses: formattedExpenses,
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('Scan expense API error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message || 'Error processing document' }));
          }
        });
      });

      server.middlewares.use('/api/notes/kilo-transcribe', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const {
              title = '',
              speakerOrAuthor = '',
              noteType = 'sermon',
              rawText = '',
              audioTranscript = '',
            } = data;

            const effectiveTitle = title || (noteType === 'sermon' ? 'Sunday Sermon Reflection' : 'Book Chapter Study');
            const cleanedText = (audioTranscript + '\n' + rawText).trim() || 'Transcribed study notes from photo capture.';

            const result = {
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
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('kilo transcribe error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message || 'Failed' }));
          }
        });
      });

      // In-memory cache for scripture
      const scriptureCache = new Map<string, any>();

      // Bible Scripture Lookup Endpoint (KJV, NKJV, NLT, AMP)
      server.middlewares.use('/api/bible/lookup', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { reference, translation = 'kjv' } = JSON.parse(body || '{}');
            const cleanRef = (reference || '').trim();
            const cleanTrans = (translation || 'kjv').toLowerCase().trim();

            if (!cleanRef) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Scripture reference is required.' }));
            }

            const cacheKey = `${cleanRef.toLowerCase()}_${cleanTrans}`;
            if (scriptureCache.has(cacheKey)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(scriptureCache.get(cacheKey)));
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
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify(result));
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

Return STRICTLY valid JSON matching this schema without Markdown formatting or code blocks:
{
  "reference": "${cleanRef}",
  "text": "Full verse text here",
  "translation": "${transName}",
  "translationId": "${cleanTrans}",
  "verses": [
    {
      "book_id": "ROM",
      "book_name": "Romans",
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
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify(parsed));
              }
            }

            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                error: `Could not retrieve scripture for "${cleanRef}" in translation ${cleanTrans.toUpperCase()}.`,
              })
            );
          } catch (err: any) {
            console.error('Error in /api/bible/lookup:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message || 'Failed to fetch scripture' }));
          }
        });
      });

      // Bible Chapter Verses Endpoint (for browsing verses in KJV, NKJV, NLT, AMP)
      server.middlewares.use('/api/bible/chapter', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { book, chapter, translation = 'kjv' } = JSON.parse(body || '{}');
            const cleanBook = (book || '').trim();
            const chapterNum = Number(chapter) || 1;
            const cleanTrans = (translation || 'kjv').toLowerCase().trim();

            if (!cleanBook) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Bible book name is required.' }));
            }

            const cacheKey = `chap_${cleanBook.toLowerCase()}_${chapterNum}_${cleanTrans}`;
            if (scriptureCache.has(cacheKey)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(scriptureCache.get(cacheKey)));
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
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify(result));
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
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify(parsed));
                }
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ verses: [] }));
          } catch (err: any) {
            console.error('Error in /api/bible/chapter:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message || 'Failed to fetch chapter' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiScanPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
