/**
 * اختبار موقع مترجم عربي - أمهري
 * Arabic Amharic Translator Website Test
 */

const { chromium } = require('playwright');

async function testWebsite() {
    console.log('Starting website test...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // تخزين الأخطاء
    const errors = [];

    // مراقبة Console
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`Console Error: ${msg.text()}`);
        }
    });

    // مراقبة أخطاء الصفحة
    page.on('pageerror', error => {
        errors.push(`Page Error: ${error.message}`);
    });

    // مراقبة طلبات الشبكة الفاشلة
    page.on('requestfailed', request => {
        errors.push(`Network Error: ${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`);
    });

    try {
        // الانتظار لتحميل الصفحة
        console.log('Loading page...');
        await page.goto(`file:///workspace/index.html`, { waitUntil: 'networkidle' });
        
        // انتظار تهيئة التطبيق
        await page.waitForTimeout(2000);

        // التحقق من وجود العناصر الأساسية
        console.log('Checking main elements...');

        const elements = {
            header: await page.$('.header'),
            logo: await page.$('.logo'),
            themeToggle: await page.$('#theme-toggle'),
            sourceLang: await page.$('#source-lang'),
            targetLang: await page.$('#target-lang'),
            sourceText: await page.$('#source-text'),
            resultText: await page.$('#result-text'),
            translateBtn: await page.$('#translate-btn'),
            swapBtn: await page.$('#swap-languages'),
            features: await page.$('.features'),
            historySection: await page.$('.history-section')
        };

        // التحقق من وجود كل عنصر
        for (const [name, element] of Object.entries(elements)) {
            if (!element) {
                errors.push(`Missing element: ${name}`);
            }
        }

        // اختبار التفاعلات
        console.log('Testing interactions...');

        // اختبار تبديل الثيم
        await page.click('#theme-toggle');
        await page.waitForTimeout(500);
        const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        if (theme !== 'dark') {
            errors.push('Theme toggle not working');
        }

        // اختبار تبديل اللغات
        await page.click('#swap-languages');
        await page.waitForTimeout(500);
        const sourceLang = await page.$eval('#source-lang', el => el.value);
        if (sourceLang !== 'am') {
            errors.push('Language swap not working');
        }

        // اختبار إدخال نص
        await page.fill('#source-text', 'مرحبا بالعالم\nكيف حالك؟');
        await page.waitForTimeout(500);

        // التحقق من计数器 الكلمات (4 كلمات: مرحبا، بالعالم، كيف، حالك؟ = 4)
        const wordCount = await page.$eval('#word-count', el => el.textContent);
        console.log(`Word count: ${wordCount}`);
        if (wordCount !== '4') {
            errors.push(`Word count incorrect: expected 4, got ${wordCount}`);
        }

        // التحقق من计数器 الأسطر (2 سطر)
        const lineCount = await page.$eval('#sentence-count', el => el.textContent);
        console.log(`Line count: ${lineCount}`);
        if (lineCount !== '2') {
            errors.push(`Line count incorrect: expected 2, got ${lineCount}`);
        }

        // التحقق من计数器 الفقرات (1 فقرة)
        const paragraphCount = await page.$eval('#paragraph-count', el => el.textContent);
        console.log(`Paragraph count: ${paragraphCount}`);
        if (paragraphCount !== '1') {
            errors.push(`Paragraph count incorrect: expected 1, got ${paragraphCount}`);
        }

        // التحقق من计数器 الأحرف (23 حرف)
        const charCount = await page.$eval('#char-count', el => el.textContent);
        console.log(`Char count: ${charCount}`);
        if (charCount !== '23') {
            errors.push(`Char count incorrect: expected 23, got ${charCount}`);
        }

        // التحقق من وجود عنصر الإحصائيات
        const statsContainer = await page.$('#char-stats-container');
        if (!statsContainer) {
            errors.push('Stats container not found');
        }

        // التحقق من تفعيل زر الترجمة
        const translateDisabled = await page.$eval('#translate-btn', el => el.disabled);
        if (translateDisabled) {
            errors.push('Translate button not enabled after input');
        }

        // اختبار نص طويل جداً (50000 حرف للوصول لـ danger)
        const veryLongText = 'كلمة '.repeat(10000); // 50000 حرف
        await page.fill('#source-text', veryLongText);
        await page.waitForTimeout(500);
        
        // التحقق منعداد الأحرف (50000 حرف)
        const charCountVeryLong = await page.$eval('#char-count', el => el.textContent);
        console.log(`Char count very long text: ${charCountVeryLong}`);
        
        // يجب أن يكون char-stat في وضع الخطر (== 50000)
        const charDangerVeryLong = await page.$eval('#char-stat', el => el.classList.contains('danger'));
        if (!charDangerVeryLong) {
            errors.push('Char danger not applied when at limit');
        }

        // اختبار شريط التقدم
        const progressPercent = await page.$eval('#progress-percent', el => el.textContent);
        console.log(`Progress percent: ${progressPercent}`);
        if (progressPercent !== '100%') {
            errors.push(`Progress percent incorrect: expected 100%, got ${progressPercent}`);
        }

        // طباعة النتائج
        console.log('\n=== Test Results ===');
        
        if (errors.length === 0) {
            console.log('✅ All tests passed! No errors found.');
        } else {
            console.log(`❌ Found ${errors.length} error(s):`);
            errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

    } catch (error) {
        console.error('Test execution error:', error.message);
        errors.push(`Test Execution Error: ${error.message}`);
    } finally {
        await browser.close();
    }

    return errors;
}

// تشغيل الاختبار
testWebsite()
    .then(errors => {
        process.exit(errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
